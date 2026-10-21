/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock("@/lib/ai/resume-parser", () => ({
  extractResumeText: jest.fn().mockResolvedValue("sample resume text"),
  parseResumeWithGemini: jest.fn().mockResolvedValue({
    profile: {
      full_name: "Mock User",
      email: "mock@example.com",
      phone: "",
      location: "",
      github_url: "",
      linkedin_url: "",
      website_url: "",
      summary: "",
    },
    skills: [],
    experiences: [],
    educations: [],
    projects: [],
    certifications: [],
  }),
}));

// Mock Supabase Server Client
const mockUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
const mockDelete = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
const mockInsert = jest.fn().mockResolvedValue({ error: null });

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "test-user-id", email: "test@example.com" } },
        error: null,
      }),
    },
    from: jest.fn(() => ({
      update: mockUpdate,
      delete: mockDelete,
      insert: mockInsert,
    })),
  }),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const {
  updatePersonalInfo,
  saveSkills,
  saveExperiences,
  saveEducations,
  saveProjects,
  saveCertifications,
} = require("@/features/resume/actions");

describe("Resume & Profile Server Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("updatePersonalInfo", () => {
    it("successfully validates and calls supabase update", async () => {
      const validProfile = {
        full_name: "Jane Smith",
        email: "jane@test.com",
        phone: "+1 555 4321",
        location: "Seattle, WA",
        github_url: "https://github.com/janesmith",
        linkedin_url: "https://linkedin.com/in/janesmith",
        website_url: "https://janesmith.com",
        summary: "Software engineer specializing in AI and cloud infrastructure.",
      };

      const result = await updatePersonalInfo(validProfile);
      expect(result.ok).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("rejects non-object or invalid profile data", async () => {
      const result = await updatePersonalInfo(null);
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("saveSkills", () => {
    it("validates and replaces user skills", async () => {
      const skills = [
        { name: "React", category: "Frontend" },
        { name: "Node.js", category: "Backend" },
      ];

      const result = await saveSkills(skills);
      expect(result.ok).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalled();
    });

    it("rejects skills with empty names", async () => {
      const invalidSkills = [{ name: "" }];
      const result = await saveSkills(invalidSkills);
      expect(result.ok).toBe(false);
    });
  });

  describe("saveExperiences", () => {
    it("validates and saves work experiences", async () => {
      const experiences = [
        {
          company: "Google",
          title: "Software Engineer",
          location: "Mountain View, CA",
          start_date: "2022",
          end_date: "Present",
          is_current: true,
          description: "Full stack engineering",
          responsibilities: ["Built features"],
        },
      ];

      const result = await saveExperiences(experiences);
      expect(result.ok).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalled();
    });

    it("rejects experience missing required title or company", async () => {
      const invalidExperiences = [{ company: "" }];
      const result = await saveExperiences(invalidExperiences);
      expect(result.ok).toBe(false);
    });
  });

  describe("saveEducations, saveProjects, saveCertifications", () => {
    it("saves educations properly", async () => {
      const educations = [
        {
          institution: "MIT",
          degree: "BS",
          field_of_study: "Computer Science",
          start_date: "2018",
          end_date: "2022",
          gpa: "4.0",
        },
      ];
      const result = await saveEducations(educations);
      expect(result.ok).toBe(true);
    });

    it("saves projects properly", async () => {
      const projects = [
        {
          title: "AI Job Agent",
          description: "Autonomous job applicant",
          url: "https://jobbuddy.ai",
          github_url: "https://github.com/jobbuddy",
          technologies: ["Next.js", "Supabase"],
        },
      ];
      const result = await saveProjects(projects);
      expect(result.ok).toBe(true);
    });

    it("saves certifications properly", async () => {
      const certs = [
        {
          name: "Certified Kubernetes Administrator",
          issuer: "CNCF",
          issue_date: "2023",
          expiration_date: "2026",
          credential_url: "https://cncf.io",
        },
      ];
      const result = await saveCertifications(certs);
      expect(result.ok).toBe(true);
    });
  });
});
