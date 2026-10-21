import { extractText } from "unpdf";
import mammoth from "mammoth";
import { createGeminiClient, getGeminiApiKeys, getGeminiCandidateModels } from "./gemini";
import { ParsedResumeData, ParsedResumeSchema } from "@/features/resume/schema";

/**
 * Extracts raw textual content from PDF or DOCX file buffer.
 * Throws immediately with a descriptive error if the extracted text is empty,
 * rather than forwarding an empty body to Gemini.
 */
export async function extractResumeText(
  buffer: Buffer,
  fileType: "pdf" | "docx"
): Promise<string> {
  if (fileType === "pdf") {
    let combined = "";
    try {
      const cleanArrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
      const uint8 = new Uint8Array(cleanArrayBuffer);
      const { text } = await extractText(uint8, { mergePages: true });
      combined = Array.isArray(text) ? text.join("\n") : (text ?? "");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse PDF document.";
      throw new Error(`PDF extraction failed: ${msg}`);
    }

    // Explicit post-extraction length guard — fail fast before hitting Gemini
    const trimmed = combined.trim();
    if (trimmed.length === 0) {
      throw new Error(
        "PDF text extraction returned empty content. The file may be image-only (scanned). Please upload a text-based PDF or a DOCX file instead."
      );
    }
    if (trimmed.length < 30) {
      throw new Error(
        `PDF text extraction returned too little text (${trimmed.length} chars). The file may be corrupted or image-only.`
      );
    }
    return trimmed;
  }

  if (fileType === "docx") {
    let text = "";
    try {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value ?? "";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse DOCX document.";
      throw new Error(`DOCX extraction failed: ${msg}`);
    }

    // Explicit post-extraction length guard
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      throw new Error(
        "DOCX text extraction returned empty content. The file may be corrupted or contain only images."
      );
    }
    if (trimmed.length < 30) {
      throw new Error(
        `DOCX text extraction returned too little text (${trimmed.length} chars). The file may be corrupted.`
      );
    }
    return trimmed;
  }

  throw new Error(`Unsupported file type: ${fileType}. Only PDF and DOCX are supported.`);
}

/**
 * JSON schema string used in the Gemini system instruction.
 * Explicitly typed as a JSON Schema-like format to enforce strict JSON output mode.
 */
const SYSTEM_PROMPT = `You are an expert AI Resume Parsing assistant for JobBuddy.
Analyze the provided resume text thoroughly and extract ALL information into a structured JSON object.

STRICT RULES:
1. Extract with high accuracy. Do NOT fabricate or guess facts not present in the text.
2. Every string field that has no data must be an empty string "", never null or undefined.
3. Every array field that has no data must be an empty array [], never null or undefined.
4. For profile object, extract: full_name, email, phone, location, github_url, linkedin_url, website_url, and a professional summary paragraph.
5. For skills array: each entry has "name" (non-empty string, the skill name) and "category" (e.g. "Languages", "Frontend", "Backend", "DevOps", "Databases", "Tools", "Soft Skills").
6. For experiences array: each entry has company (non-empty), title (non-empty), location, start_date (e.g. "Jan 2022"), end_date (e.g. "Present" or "Dec 2023"), is_current (true if "Present" or "Current"), description, and responsibilities (array of individual bullet point strings).
7. For educations array: each entry has institution (non-empty), degree, field_of_study, start_date, end_date, gpa.
8. For projects array: each entry has title (non-empty), description, url, github_url, and technologies (array of technology name strings).
9. For certifications array: each entry has name (non-empty), issuer, issue_date, expiration_date, credential_url.

OUTPUT FORMAT: Return ONLY a single valid JSON object. No markdown, no code fences, no extra commentary.
{
  "profile": {
    "full_name": "",
    "email": "",
    "phone": "",
    "location": "",
    "github_url": "",
    "linkedin_url": "",
    "website_url": "",
    "summary": ""
  },
  "skills": [{ "name": "", "category": "" }],
  "experiences": [{
    "company": "", "title": "", "location": "",
    "start_date": "", "end_date": "", "is_current": false,
    "description": "", "responsibilities": []
  }],
  "educations": [{
    "institution": "", "degree": "", "field_of_study": "",
    "start_date": "", "end_date": "", "gpa": ""
  }],
  "projects": [{ "title": "", "description": "", "url": "", "github_url": "", "technologies": [] }],
  "certifications": [{ "name": "", "issuer": "", "issue_date": "", "expiration_date": "", "credential_url": "" }]
}`;

/**
 * Normalises a raw Gemini JSON payload before Zod validation.
 * Handles field name variants (e.g. Gemini occasionally maps
 * responsibilities → highlights, title → position, etc.).
 */
function normaliseResumePayload(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;

  const obj = raw as Record<string, unknown>;

  // Coerce top-level summary → profile.summary if Gemini puts it at root
  if (typeof obj.summary === "string" && typeof obj.profile === "object" && obj.profile !== null) {
    const profile = obj.profile as Record<string, unknown>;
    if (!profile.summary) {
      profile.summary = obj.summary;
    }
    delete obj.summary;
  }

  // Normalise experiences array field name variants
  if (Array.isArray(obj.experiences)) {
    obj.experiences = obj.experiences.map((exp: unknown) => {
      if (typeof exp !== "object" || exp === null) return exp;
      const e = exp as Record<string, unknown>;
      // "position" → "title"
      if (!e.title && e.position) { e.title = e.position; delete e.position; }
      // "highlights" → "responsibilities"
      if (!e.responsibilities && e.highlights) { e.responsibilities = e.highlights; delete e.highlights; }
      // "bullets" → "responsibilities"
      if (!e.responsibilities && e.bullets) { e.responsibilities = e.bullets; delete e.bullets; }
      // ensure arrays
      if (!Array.isArray(e.responsibilities)) e.responsibilities = [];
      // ensure booleans
      if (typeof e.is_current !== "boolean") {
        e.is_current = String(e.end_date ?? "").toLowerCase().includes("present") ||
          String(e.end_date ?? "").toLowerCase().includes("current");
      }
      // Coerce all string fields to string
      for (const key of ["company", "title", "location", "start_date", "end_date", "description"]) {
        if (typeof e[key] !== "string") e[key] = "";
      }
      return e;
    });
  }

  // Normalise projects array
  if (Array.isArray(obj.projects)) {
    obj.projects = obj.projects.map((proj: unknown) => {
      if (typeof proj !== "object" || proj === null) return proj;
      const p = proj as Record<string, unknown>;
      // "name" → "title"
      if (!p.title && p.name) { p.title = p.name; delete p.name; }
      if (!Array.isArray(p.technologies)) p.technologies = [];
      for (const key of ["title", "description", "url", "github_url"]) {
        if (typeof p[key] !== "string") p[key] = "";
      }
      return p;
    });
  }

  // Normalise skills — filter out entries with empty names
  if (Array.isArray(obj.skills)) {
    obj.skills = obj.skills
      .map((s: unknown) => {
        if (typeof s !== "object" || s === null) return null;
        const sk = s as Record<string, unknown>;
        if (typeof sk.name !== "string" || sk.name.trim().length === 0) return null;
        if (typeof sk.category !== "string" || sk.category.trim().length === 0) {
          sk.category = "General";
        }
        return sk;
      })
      .filter(Boolean);
  }

  // Normalise educations
  if (Array.isArray(obj.educations)) {
    obj.educations = obj.educations.map((ed: unknown) => {
      if (typeof ed !== "object" || ed === null) return ed;
      const e = ed as Record<string, unknown>;
      for (const key of ["institution", "degree", "field_of_study", "start_date", "end_date", "gpa"]) {
        if (typeof e[key] !== "string") e[key] = "";
      }
      return e;
    });
  }

  // Normalise certifications
  if (Array.isArray(obj.certifications)) {
    obj.certifications = obj.certifications.map((c: unknown) => {
      if (typeof c !== "object" || c === null) return c;
      const cert = c as Record<string, unknown>;
      for (const key of ["name", "issuer", "issue_date", "expiration_date", "credential_url"]) {
        if (typeof cert[key] !== "string") cert[key] = "";
      }
      return cert;
    });
  }

  // Ensure profile fields are all strings
  if (typeof obj.profile === "object" && obj.profile !== null) {
    const profile = obj.profile as Record<string, unknown>;
    for (const key of ["full_name", "email", "phone", "location", "github_url", "linkedin_url", "website_url", "summary"]) {
      if (typeof profile[key] !== "string") profile[key] = "";
    }
  }

  return obj;
}

/**
 * Parses resume text using Google Gemini AI with multi-key rotation and model failover.
 * Uses strict JSON mode (responseMimeType: application/json) and normalises
 * the payload before Zod validation to handle common model output variations.
 */
export async function parseResumeWithGemini(resumeText: string): Promise<ParsedResumeData> {
  // Pre-flight guard: don't hit the AI with empty text
  if (!resumeText || resumeText.trim().length === 0) {
    throw new Error("Resume text is empty. Text extraction must have failed before reaching the AI parser.");
  }

  const keys = getGeminiApiKeys();
  const models = getGeminiCandidateModels();

  let lastError: Error | null = null;
  const diagnostics: string[] = [];

  // Try each configured API key
  for (let keyIdx = 0; keyIdx < keys.length; keyIdx++) {
    const key = keys[keyIdx];
    const client = createGeminiClient(key);

    // Try each candidate model
    for (let modelIdx = 0; modelIdx < models.length; modelIdx++) {
      const model = models[modelIdx];

      try {
        const response = await client.models.generateContent({
          model,
          contents: `RESUME TEXT:\n"""\n${resumeText}\n"""`,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });

        const rawOutput = (response.text ?? "").trim();

        if (!rawOutput) {
          throw new Error("Gemini returned an empty response body.");
        }

        // Strip any accidental markdown fences Gemini may add despite JSON mode
        const cleaned = rawOutput
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        let jsonResult: unknown;
        try {
          jsonResult = JSON.parse(cleaned);
        } catch {
          throw new Error(`Gemini response is not valid JSON: ${cleaned.slice(0, 200)}`);
        }

        // Normalise field variants before Zod validation
        const normalised = normaliseResumePayload(jsonResult);

        const parsed = ParsedResumeSchema.safeParse(normalised);
        if (!parsed.success) {
          const issues = parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ");
          throw new Error(`Resume schema validation failed: ${issues}`);
        }

        return parsed.data;
      } catch (err: unknown) {
        const rawMsg = err instanceof Error ? err.message : String(err);
        lastError = err instanceof Error ? err : new Error(rawMsg);
        diagnostics.push(`[key${keyIdx + 1}/${model}]: ${rawMsg.slice(0, 120)}`);
        // Instant failover to next model/key — no artificial delay
        continue;
      }
    }
  }

  // Construct a clear, actionable error message from diagnostics
  const errMsg = lastError?.message || "";
  const diagSummary = diagnostics.join(" | ");

  if (errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("UNAVAILABLE") || errMsg.includes("overloaded")) {
    throw new Error(
      "Gemini AI servers are temporarily overloaded. We tried all fallback keys and models. Please wait 30 seconds and try again."
    );
  }
  if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
    throw new Error(
      "API rate limit reached. Please wait a moment and try again."
    );
  }
  if (errMsg.includes("schema validation failed")) {
    throw new Error(
      `AI returned data in an unexpected format. Diagnostics: ${diagSummary}`
    );
  }

  throw new Error(`AI resume parsing failed after all retries. Diagnostics: ${diagSummary}`);
}
