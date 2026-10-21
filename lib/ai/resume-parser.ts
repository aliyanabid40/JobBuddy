import { extractText } from "unpdf";
import mammoth from "mammoth";
import { createGeminiClient, getGeminiApiKeys, getGeminiCandidateModels } from "./gemini";
import { ParsedResumeData, ParsedResumeSchema } from "@/features/resume/schema";

/**
 * Extracts raw textual content from PDF or DOCX file buffer
 */
export async function extractResumeText(
  buffer: Buffer,
  fileType: "pdf" | "docx"
): Promise<string> {
  if (fileType === "pdf") {
    try {
      const uint8 = new Uint8Array(buffer);
      const { text } = await extractText(uint8);
      const combined = Array.isArray(text) ? text.join("\n") : text;
      if (!combined || combined.trim().length === 0) {
        throw new Error("Could not extract any readable text from this PDF file.");
      }
      return combined;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse PDF document.";
      throw new Error(`PDF extraction failed: ${msg}`);
    }
  }

  if (fileType === "docx") {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;
      if (!text || text.trim().length === 0) {
        throw new Error("Could not extract any readable text from this DOCX file.");
      }
      return text;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse DOCX document.";
      throw new Error(`DOCX extraction failed: ${msg}`);
    }
  }

  throw new Error(`Unsupported file type: ${fileType}. Only PDF and DOCX are supported.`);
}

const SYSTEM_PROMPT = `
You are an expert AI Resume Parsing assistant for JobBuddy.
Analyze the provided resume text thoroughly and extract all information into a structured JSON object.

Strict Rules:
1. Extract with high accuracy. Do not fabricate facts that are not present.
2. For profile, extract: full_name, email, phone, location, github_url, linkedin_url, website_url, and a cohesive professional summary.
3. For skills, organize them into clean names with logical categories (e.g., 'Languages', 'Frontend', 'Backend', 'DevOps', 'Databases', 'Tools', etc.).
4. For work experiences:
   - Extract company, title, location, start_date (e.g. "Jan 2022"), end_date (e.g. "Present" or "Dec 2023"), is_current (true if current/present), description, and an array of individual bullet points/responsibilities.
5. For educations:
   - Extract institution, degree, field_of_study, start_date, end_date, gpa.
6. For projects:
   - Extract title, description, url, github_url, and technologies (array of strings).
7. For certifications:
   - Extract name, issuer, issue_date, expiration_date, credential_url.
8. Output ONLY valid JSON adhering strictly to this schema format:
{
  "profile": {
    "full_name": string,
    "email": string,
    "phone": string,
    "location": string,
    "github_url": string,
    "linkedin_url": string,
    "website_url": string,
    "summary": string
  },
  "skills": [
    { "name": string, "category": string }
  ],
  "experiences": [
    {
      "company": string,
      "title": string,
      "location": string,
      "start_date": string,
      "end_date": string,
      "is_current": boolean,
      "description": string,
      "responsibilities": string[]
    }
  ],
  "educations": [
    {
      "institution": string,
      "degree": string,
      "field_of_study": string,
      "start_date": string,
      "end_date": string,
      "gpa": string
    }
  ],
  "projects": [
    {
      "title": string,
      "description": string,
      "url": string,
      "github_url": string,
      "technologies": string[]
    }
  ],
  "certifications": [
    {
      "name": string,
      "issuer": string,
      "issue_date": string,
      "expiration_date": string,
      "credential_url": string
    }
  ]
}
`;

/**
 * Parses resume text using Google Gemini AI with multi-key rotation and model failover
 */
export async function parseResumeWithGemini(resumeText: string): Promise<ParsedResumeData> {
  const keys = getGeminiApiKeys();
  const models = getGeminiCandidateModels();

  let lastError: Error | null = null;

  // Try each configured API key
  for (let keyIdx = 0; keyIdx < keys.length; keyIdx++) {
    const key = keys[keyIdx];
    const client = createGeminiClient(key);

    // Try each candidate model
    for (let modelIdx = 0; modelIdx < models.length; modelIdx++) {
      const model = models[modelIdx];

      // Retry up to 2 attempts on transient 503 / 429
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await client.models.generateContent({
            model: model,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${SYSTEM_PROMPT}\n\nRESUME TEXT CONTENT:\n\"\"\"\n${resumeText}\n\"\"\"`,
                  },
                ],
              },
            ],
            config: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          });

          const rawOutput = response.text || "";
          if (!rawOutput) {
            throw new Error("Gemini AI returned an empty response during resume parsing.");
          }

          // Sanitize potential markdown block wrapping
          const cleaned = rawOutput
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

          const jsonResult = JSON.parse(cleaned);
          const parsed = ParsedResumeSchema.safeParse(jsonResult);
          if (!parsed.success) {
            throw new Error(`Resume schema validation failed: ${parsed.error.message}`);
          }

          return parsed.data;
        } catch (err: unknown) {
          const rawMsg = err instanceof Error ? err.message : String(err);
          const isDemandSpike = rawMsg.includes("503") || rawMsg.includes("high demand") || rawMsg.includes("UNAVAILABLE");
          const isRateLimit = rawMsg.includes("429") || rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("quota");
          const isNotFound = rawMsg.includes("404") || rawMsg.includes("NOT_FOUND") || rawMsg.includes("no longer available");

          lastError = err instanceof Error ? err : new Error(rawMsg);

          // If model is not available for this key/API version, immediately jump to next model
          if (isNotFound) {
            break;
          }

          // If it's a transient high demand spike or rate limit, wait briefly and retry
          if ((isDemandSpike || isRateLimit) && attempt === 1) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            continue;
          }

          // Otherwise break to try next model or next API key
          break;
        }
      }
    }
  }

  // Provide user-friendly explanation instead of raw JSON dump
  const errMsg = lastError?.message || "";
  if (errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("UNAVAILABLE")) {
    throw new Error(
      "Gemini AI servers are temporarily experiencing high demand from Google. We automatically tried alternate keys and models. Please wait a few seconds and try again."
    );
  }
  if (errMsg.includes("429") || errMsg.includes("quota")) {
    throw new Error(
      "Gemini AI API rate limit reached. Please wait a brief moment and try again."
    );
  }

  throw new Error(`AI resume parsing failed: ${errMsg}`);
}
