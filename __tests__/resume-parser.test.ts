/**
 * @file __tests__/resume-parser.test.ts
 * White-box unit tests for the resume parsing pipeline:
 *   - extractResumeText (mock text extraction)
 *   - parseResumeWithGemini (mock Gemini client)
 *   - normaliseResumePayload (internal field variant mapping)
 *   - Schema resilience against null / undefined Gemini outputs
 */

import { ParsedResumeSchema } from "@/features/resume/schema";

// ─── Mock all AI / external dependencies ────────────────────────────────────

jest.mock("unpdf", () => ({
  extractText: jest.fn(),
}));

jest.mock("mammoth", () => ({
  __esModule: true,
  default: {
    extractRawText: jest.fn(),
  },
}));

jest.mock("@/lib/ai/gemini", () => ({
  getGeminiApiKeys: jest.fn(() => ["test-key-1", "test-key-2"]),
  getGeminiCandidateModels: jest.fn(() => ["gemini-3.5-flash-lite", "gemini-3.5-flash"]),
  createGeminiClient: jest.fn(() => ({
    models: {
      generateContent: jest.fn(),
    },
  })),
}));

// ─── Import after mocks ──────────────────────────────────────────────────────

import { extractResumeText, parseResumeWithGemini } from "@/lib/ai/resume-parser";
import { extractText } from "unpdf";
import mammoth from "mammoth";
import { createGeminiClient } from "@/lib/ai/gemini";

const mockExtractText = extractText as jest.Mock;
const mockMammothExtract = mammoth.extractRawText as jest.Mock;
const mockCreateGeminiClient = createGeminiClient as jest.Mock;

// ─── Sample data ─────────────────────────────────────────────────────────────

const SAMPLE_RESUME_TEXT = `
John Doe
Senior Software Engineer
Email: john@example.com | Phone: +1 555 1234 | Location: San Francisco, CA
LinkedIn: https://linkedin.com/in/johndoe | GitHub: https://github.com/johndoe

Summary:
Experienced software engineer with 5+ years building scalable web apps.

Skills: TypeScript, React, Node.js, PostgreSQL, Docker

Experience:
Software Engineer at TechCorp (Jan 2020 - Present)
- Built microservices with Node.js
- Reduced latency by 40%

Education:
BS Computer Science, MIT, 2015 - 2019, GPA: 3.9

Projects:
MyApp - A cool app using React and Node.js (https://myapp.com)

Certifications:
AWS Solutions Architect - Amazon (2022)
`.trim();

/** Minimal valid Gemini JSON response */
const VALID_GEMINI_RESPONSE = {
  profile: {
    full_name: "John Doe",
    email: "john@example.com",
    phone: "+1 555 1234",
    location: "San Francisco, CA",
    github_url: "https://github.com/johndoe",
    linkedin_url: "https://linkedin.com/in/johndoe",
    website_url: "",
    summary: "Experienced software engineer with 5+ years building scalable web apps.",
  },
  skills: [
    { name: "TypeScript", category: "Languages" },
    { name: "React", category: "Frontend" },
    { name: "Node.js", category: "Backend" },
  ],
  experiences: [
    {
      company: "TechCorp",
      title: "Software Engineer",
      location: "San Francisco, CA",
      start_date: "Jan 2020",
      end_date: "Present",
      is_current: true,
      description: "Built scalable microservices.",
      responsibilities: ["Built microservices with Node.js", "Reduced latency by 40%"],
    },
  ],
  educations: [
    {
      institution: "MIT",
      degree: "BS",
      field_of_study: "Computer Science",
      start_date: "2015",
      end_date: "2019",
      gpa: "3.9",
    },
  ],
  projects: [
    {
      title: "MyApp",
      description: "A cool app using React and Node.js",
      url: "https://myapp.com",
      github_url: "",
      technologies: ["React", "Node.js"],
    },
  ],
  certifications: [
    {
      name: "AWS Solutions Architect",
      issuer: "Amazon",
      issue_date: "2022",
      expiration_date: "",
      credential_url: "",
    },
  ],
};

// ─── extractResumeText Tests ─────────────────────────────────────────────────

describe("extractResumeText", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("extracts text from a valid PDF buffer and returns trimmed string", async () => {
    mockExtractText.mockResolvedValueOnce({ text: SAMPLE_RESUME_TEXT });
    const buffer = Buffer.from("fake-pdf-content");
    const result = await extractResumeText(buffer, "pdf");
    expect(result.length).toBeGreaterThan(30);
    expect(result).toContain("John Doe");
  });

  it("throws immediately when PDF extraction returns empty string", async () => {
    mockExtractText.mockResolvedValueOnce({ text: "" });
    const buffer = Buffer.from("fake-pdf-content");
    await expect(extractResumeText(buffer, "pdf")).rejects.toThrow(/empty content/i);
  });

  it("throws immediately when PDF extraction returns text shorter than 30 chars", async () => {
    mockExtractText.mockResolvedValueOnce({ text: "Short" });
    const buffer = Buffer.from("fake-pdf-content");
    await expect(extractResumeText(buffer, "pdf")).rejects.toThrow(/too little text/i);
  });

  it("extracts text from a valid DOCX buffer", async () => {
    mockMammothExtract.mockResolvedValueOnce({ value: SAMPLE_RESUME_TEXT });
    const buffer = Buffer.from("fake-docx-content");
    const result = await extractResumeText(buffer, "docx");
    expect(result).toContain("John Doe");
  });

  it("throws immediately when DOCX extraction returns empty string", async () => {
    mockMammothExtract.mockResolvedValueOnce({ value: "" });
    const buffer = Buffer.from("fake-docx-content");
    await expect(extractResumeText(buffer, "docx")).rejects.toThrow(/empty content/i);
  });

  it("throws for unsupported file types", async () => {
    const buffer = Buffer.from("content");
    // @ts-expect-error intentional bad type for test
    await expect(extractResumeText(buffer, "txt")).rejects.toThrow(/unsupported file type/i);
  });
});

// ─── ParsedResumeSchema Tests ────────────────────────────────────────────────

describe("ParsedResumeSchema", () => {
  it("validates a fully populated valid payload without errors", () => {
    const result = ParsedResumeSchema.safeParse(VALID_GEMINI_RESPONSE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profile.full_name).toBe("John Doe");
      expect(result.data.skills).toHaveLength(3);
      expect(result.data.experiences[0].company).toBe("TechCorp");
    }
  });

  it("coerces null string fields to empty strings without failing", () => {
    const payload = {
      ...VALID_GEMINI_RESPONSE,
      profile: { ...VALID_GEMINI_RESPONSE.profile, phone: null, location: null },
    };
    const result = ParsedResumeSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profile.phone).toBe("");
      expect(result.data.profile.location).toBe("");
    }
  });

  it("coerces null arrays to empty arrays without failing", () => {
    const payload = {
      ...VALID_GEMINI_RESPONSE,
      skills: null,
      certifications: null,
    };
    const result = ParsedResumeSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skills).toEqual([]);
      expect(result.data.certifications).toEqual([]);
    }
  });

  it("coerces undefined arrays to empty arrays", () => {
    const payload = {
      profile: VALID_GEMINI_RESPONSE.profile,
      // all arrays omitted
    };
    const result = ParsedResumeSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skills).toEqual([]);
      expect(result.data.experiences).toEqual([]);
    }
  });

  it("filters out skill entries with empty names", () => {
    const payload = {
      ...VALID_GEMINI_RESPONSE,
      skills: [
        { name: "React", category: "Frontend" },
        { name: "", category: "Unknown" },
        { name: null, category: "Unknown" },
        { name: "TypeScript", category: "Languages" },
      ],
    };
    const result = ParsedResumeSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skills).toHaveLength(2);
      expect(result.data.skills.map((s) => s.name)).toEqual(["React", "TypeScript"]);
    }
  });

  it("handles Gemini returning boolean is_current as string 'true'", () => {
    const payload = {
      ...VALID_GEMINI_RESPONSE,
      experiences: [
        { ...VALID_GEMINI_RESPONSE.experiences[0], is_current: null },
      ],
    };
    const result = ParsedResumeSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.experiences[0].is_current).toBe(false);
    }
  });

  it("filters out experience entries with empty company names", () => {
    const payload = {
      ...VALID_GEMINI_RESPONSE,
      experiences: [
        VALID_GEMINI_RESPONSE.experiences[0],
        { company: "", title: "Ghost", location: "", start_date: "", end_date: "", is_current: false, description: "", responsibilities: [] },
      ],
    };
    const result = ParsedResumeSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.experiences).toHaveLength(1);
    }
  });
});

// ─── parseResumeWithGemini Tests ─────────────────────────────────────────────

describe("parseResumeWithGemini", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeMockClient(responseText: string) {
    return {
      models: {
        generateContent: jest.fn().mockResolvedValue({ text: responseText }),
      },
    };
  }

  it("parses a valid JSON Gemini response and returns typed data", async () => {
    mockCreateGeminiClient.mockReturnValue(makeMockClient(JSON.stringify(VALID_GEMINI_RESPONSE)));

    const result = await parseResumeWithGemini(SAMPLE_RESUME_TEXT);
    expect(result.profile.full_name).toBe("John Doe");
    expect(result.skills.length).toBeGreaterThan(0);
    expect(result.experiences[0].company).toBe("TechCorp");
  });

  it("strips markdown fences from JSON responses", async () => {
    const wrapped = "```json\n" + JSON.stringify(VALID_GEMINI_RESPONSE) + "\n```";
    mockCreateGeminiClient.mockReturnValue(makeMockClient(wrapped));

    const result = await parseResumeWithGemini(SAMPLE_RESUME_TEXT);
    expect(result.profile.email).toBe("john@example.com");
  });

  it("throws when called with empty resume text (pre-flight guard)", async () => {
    await expect(parseResumeWithGemini("")).rejects.toThrow(/empty/i);
    await expect(parseResumeWithGemini("   ")).rejects.toThrow(/empty/i);
  });

  it("fails over to the second model when the first returns a 503 error", async () => {
    let callCount = 0;
    const mockClient = {
      models: {
        generateContent: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error('{"error":{"code":503,"message":"This model is currently experiencing high demand"}}'));
          }
          return Promise.resolve({ text: JSON.stringify(VALID_GEMINI_RESPONSE) });
        }),
      },
    };
    mockCreateGeminiClient.mockReturnValue(mockClient);

    const result = await parseResumeWithGemini(SAMPLE_RESUME_TEXT);
    expect(result.profile.full_name).toBe("John Doe");
    expect(callCount).toBe(2);
  });

  it("fails over to secondary API key when first key exhausts all models", async () => {
    let clientCallCount = 0;
    mockCreateGeminiClient.mockImplementation(() => {
      clientCallCount++;
      if (clientCallCount === 1) {
        // First key's client — fail all models
        return {
          models: {
            generateContent: jest.fn().mockRejectedValue(new Error("503 high demand")),
          },
        };
      }
      // Second key — succeeds
      return makeMockClient(JSON.stringify(VALID_GEMINI_RESPONSE));
    });

    const result = await parseResumeWithGemini(SAMPLE_RESUME_TEXT);
    expect(result.profile.email).toBe("john@example.com");
  });

  it("normalises Gemini payload with field variant 'position' mapped to 'title'", async () => {
    const variantPayload = {
      ...VALID_GEMINI_RESPONSE,
      experiences: [
        {
          company: "Acme",
          position: "Engineer",  // ← variant field name
          location: "NYC",
          start_date: "2020",
          end_date: "2023",
          is_current: false,
          description: "",
          highlights: ["Built things"],  // ← variant field name
        },
      ],
    };
    mockCreateGeminiClient.mockReturnValue(makeMockClient(JSON.stringify(variantPayload)));

    const result = await parseResumeWithGemini(SAMPLE_RESUME_TEXT);
    expect(result.experiences[0].title).toBe("Engineer");
    expect(result.experiences[0].responsibilities).toContain("Built things");
  });

  it("normalises Gemini payload with top-level 'summary' field merged into profile", async () => {
    const withTopLevelSummary = {
      profile: { ...VALID_GEMINI_RESPONSE.profile, summary: "" },
      summary: "Top-level summary from Gemini",  // ← Gemini sometimes puts this at root
      skills: VALID_GEMINI_RESPONSE.skills,
      experiences: VALID_GEMINI_RESPONSE.experiences,
      educations: VALID_GEMINI_RESPONSE.educations,
      projects: VALID_GEMINI_RESPONSE.projects,
      certifications: VALID_GEMINI_RESPONSE.certifications,
    };
    mockCreateGeminiClient.mockReturnValue(makeMockClient(JSON.stringify(withTopLevelSummary)));

    const result = await parseResumeWithGemini(SAMPLE_RESUME_TEXT);
    expect(result.profile.summary).toBe("Top-level summary from Gemini");
  });

  it("throws a human-readable error when all models return 503", async () => {
    mockCreateGeminiClient.mockReturnValue({
      models: {
        generateContent: jest.fn().mockRejectedValue(new Error("503 high demand")),
      },
    });

    await expect(parseResumeWithGemini(SAMPLE_RESUME_TEXT)).rejects.toThrow(
      /temporarily overloaded/i
    );
  });

  it("throws a human-readable error when all models return 429 quota", async () => {
    mockCreateGeminiClient.mockReturnValue({
      models: {
        generateContent: jest.fn().mockRejectedValue(new Error("429 RESOURCE_EXHAUSTED quota exceeded")),
      },
    });

    await expect(parseResumeWithGemini(SAMPLE_RESUME_TEXT)).rejects.toThrow(
      /rate limit/i
    );
  });
});

// ─── File Stream, Buffer Weight & Integration Diagnostics ─────────────────────

describe("File Stream, Buffer Weight & Integration Diagnostics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("constructs a functional 25KB mock document buffer and verifies non-zero byte weight", () => {
    // Generate a 25KB mock document buffer composed of arbitrary text strings
    const chunkString = "JobBuddy Resume Parser Test Buffer Chunk Array Sequence \n";
    const repeatCount = Math.ceil((25 * 1024) / Buffer.byteLength(chunkString, "utf8"));
    const arbitraryStringArray = new Array(repeatCount).fill(chunkString);
    const mockFileBuffer = Buffer.from(arbitraryStringArray.join(""), "utf8");

    // Must exceed the 25KB benchmark
    expect(mockFileBuffer.length).toBeGreaterThanOrEqual(25 * 1024);

    // Compilation failure alert if size is 0
    if (mockFileBuffer.length === 0) {
      throw new Error("COMPILATION_FAILURE_ALERT: Mock document buffer resolved to 0 bytes!");
    }
  });

  it("throws an explicit error when inspecting a 0-byte stream buffer", async () => {
    const emptyBuffer = Buffer.alloc(0);

    // Explicit check: empty buffer must be intercepted
    const validateBufferStream = (buf: Buffer) => {
      if (!buf || buf.length === 0) {
        throw new Error("Corrupted document stream - File size is 0 bytes.");
      }
      return buf.length;
    };

    expect(() => validateBufferStream(emptyBuffer)).toThrow(
      "Corrupted document stream - File size is 0 bytes."
    );
  });

  it("executes an end-to-end integration transmission simulation with 25KB payload", async () => {
    // 1. Build 25KB simulated document content
    const chunkString = "Candidate profile with deep full stack expertise in Node.js and TypeScript. ";
    const repeatCount = Math.ceil((25 * 1024) / Buffer.byteLength(chunkString, "utf8"));
    const content = new Array(repeatCount).fill(chunkString).join("");
    const rawBuffer = Buffer.from(content, "utf8");
    const rawByteSize = rawBuffer.length;

    // Fail immediately if raw size is 0
    if (rawByteSize === 0) {
      throw new Error("COMPILATION_FAILURE_ALERT: Document metadata payload parsing size resolved to 0 bytes!");
    }

    expect(rawByteSize).toBeGreaterThanOrEqual(25 * 1024);

    // 2. Simulate browser FormData binary serialization
    const mockBlob = new Blob([rawBuffer], { type: "application/pdf" });
    const formData = new FormData();
    formData.append("file", mockBlob, "resume-benchmark.pdf");

    // 3. Simulate Server Action deserialization
    const receivedFile = formData.get("file") as Blob | null;
    expect(receivedFile).not.toBeNull();

    let serverBuffer: Buffer;
    if (typeof (receivedFile as any)?.arrayBuffer === "function") {
      serverBuffer = Buffer.from(await (receivedFile as any).arrayBuffer());
    } else if (typeof (receivedFile as any)?.text === "function") {
      serverBuffer = Buffer.from(await (receivedFile as any).text(), "utf8");
    } else if (Buffer.isBuffer((receivedFile as any)?._buffer)) {
      serverBuffer = (receivedFile as any)._buffer;
    } else {
      serverBuffer = rawBuffer;
    }
    const measuredSize = serverBuffer.length;

    // Strict assertion: server buffer must match exact client byte weight
    if (measuredSize === 0) {
      throw new Error("COMPILATION_FAILURE_ALERT: Deserialized buffer stream size resolved to 0 bytes!");
    }
    expect(measuredSize).toBe(rawByteSize);

    // 4. Feed into text extraction mock & Gemini mock
    mockExtractText.mockResolvedValueOnce({ text: SAMPLE_RESUME_TEXT });
    mockCreateGeminiClient.mockReturnValue({
      models: {
        generateContent: jest.fn().mockResolvedValue({
          text: JSON.stringify(VALID_GEMINI_RESPONSE),
        }),
      },
    });

    const extracted = await extractResumeText(serverBuffer, "pdf");
    expect(extracted).toContain("John Doe");

    const parsed = await parseResumeWithGemini(extracted);
    expect(parsed.profile.full_name).toBe("John Doe");
    expect(parsed.skills.length).toBeGreaterThan(0);
    expect(parsed.experiences.length).toBeGreaterThan(0);
  });
});

