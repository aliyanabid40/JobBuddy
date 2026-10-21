import {
  ParsedResumeSchema,
  ProfileInfoSchema,
  SkillItemSchema,
  ExperienceItemSchema,
  EducationItemSchema,
  ProjectItemSchema,
  CertificationItemSchema,
} from "@/features/resume/schema";
import { calculateProfileCompleteness } from "@/features/resume/completeness";

describe("Resume Zod Schemas & Validators", () => {
  describe("ProfileInfoSchema", () => {
    it("validates valid profile information with defaults", () => {
      const data = {
        full_name: "Jane Doe",
        email: "jane@example.com",
        phone: "+1 555 123 4567",
        location: "New York, NY",
        summary: "Full stack developer with 5+ years of experience.",
      };
      const parsed = ProfileInfoSchema.safeParse(data);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.full_name).toBe("Jane Doe");
        expect(parsed.data.github_url).toBe("");
      }
    });
  });

  describe("SkillItemSchema", () => {
    it("requires skill name and applies default category", () => {
      const parsed = SkillItemSchema.safeParse({ name: "TypeScript" });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.name).toBe("TypeScript");
        expect(parsed.data.category).toBe("General");
      }
    });

    it("fails when skill name is empty", () => {
      const parsed = SkillItemSchema.safeParse({ name: "" });
      expect(parsed.success).toBe(false);
    });
  });

  describe("ExperienceItemSchema", () => {
    it("validates work experience with responsibilities array", () => {
      const parsed = ExperienceItemSchema.safeParse({
        company: "Tech Corp",
        title: "Software Engineer",
        start_date: "2021",
        end_date: "Present",
        is_current: true,
        responsibilities: ["Built REST APIs", "Optimized DB queries"],
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.company).toBe("Tech Corp");
        expect(parsed.data.responsibilities).toHaveLength(2);
      }
    });

    it("rejects experience missing company or title", () => {
      const parsed = ExperienceItemSchema.safeParse({ company: "Tech Corp" });
      expect(parsed.success).toBe(false);
    });
  });

  describe("EducationItemSchema & ProjectItemSchema", () => {
    it("validates education", () => {
      const parsed = EducationItemSchema.safeParse({
        institution: "Stanford University",
        degree: "BS Computer Science",
      });
      expect(parsed.success).toBe(true);
    });

    it("validates projects", () => {
      const parsed = ProjectItemSchema.safeParse({
        title: "Job Application Agent",
        technologies: ["Next.js", "Supabase", "Gemini AI"],
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.technologies).toHaveLength(3);
      }
    });

    it("validates certifications", () => {
      const parsed = CertificationItemSchema.safeParse({
        name: "AWS Solutions Architect",
        issuer: "Amazon Web Services",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.name).toBe("AWS Solutions Architect");
      }
    });
  });

  describe("ParsedResumeSchema (Full Object)", () => {
    it("validates complete structured resume payload from AI", () => {
      const fullPayload = {
        profile: {
          full_name: "Alex Smith",
          email: "alex@example.com",
          phone: "123-456-7890",
          location: "San Francisco, CA",
          github_url: "https://github.com/alexsmith",
          linkedin_url: "https://linkedin.com/in/alexsmith",
          website_url: "https://alexsmith.dev",
          summary: "Experienced staff engineer.",
        },
        skills: [{ name: "React", category: "Frontend" }],
        experiences: [
          {
            company: "Meta",
            title: "Senior Engineer",
            location: "Menlo Park",
            start_date: "2020",
            end_date: "2024",
            is_current: false,
            description: "Led frontend architecture",
            responsibilities: ["Scaled apps to 1B users"],
          },
        ],
        educations: [
          {
            institution: "UC Berkeley",
            degree: "BS EECS",
            field_of_study: "EECS",
            start_date: "2016",
            end_date: "2020",
            gpa: "3.9",
          },
        ],
        projects: [
          {
            title: "Open Source Tool",
            description: "CLI utility",
            url: "https://example.com",
            github_url: "https://github.com/example",
            technologies: ["Node.js"],
          },
        ],
        certifications: [
          {
            name: "AWS Certified Architect",
            issuer: "Amazon",
            issue_date: "2023",
            expiration_date: "2026",
            credential_url: "https://aws.amazon.com",
          },
        ],
      };

      const parsed = ParsedResumeSchema.safeParse(fullPayload);
      expect(parsed.success).toBe(true);
    });
  });
});

describe("calculateProfileCompleteness", () => {
  it("returns 0 for empty profile", () => {
    const score = calculateProfileCompleteness({});
    expect(score).toBe(0);
  });

  it("calculates partial score when only contact info is provided", () => {
    const score = calculateProfileCompleteness({
      profile: {
        full_name: "John Doe",
        email: "john@example.com",
      },
    });
    // 60% of personal info (weight 0.20) = 12%
    expect(score).toBe(12);
  });

  it("calculates high completeness score for a comprehensive profile", () => {
    const score = calculateProfileCompleteness({
      profile: {
        full_name: "John Doe",
        email: "john@example.com",
        phone: "+1 234 567 890",
        location: "Austin, TX",
        summary: "Seasoned engineer with extensive background building cloud native applications and distributed systems.",
        github_url: "https://github.com/johndoe",
      },
      experiences: [
        {
          company: "A",
          title: "Eng",
          location: "",
          start_date: "",
          end_date: "",
          is_current: true,
          description: "",
          responsibilities: ["Led team"],
        },
        {
          company: "B",
          title: "Lead",
          location: "",
          start_date: "",
          end_date: "",
          is_current: false,
          description: "",
          responsibilities: ["Shipped features"],
        },
      ],
      educations: [
        {
          institution: "University",
          degree: "BS Computer Science",
          field_of_study: "CS",
          start_date: "",
          end_date: "",
          gpa: "",
        },
      ],
      skills: [
        { name: "TypeScript", category: "Lang" },
        { name: "Node", category: "Backend" },
        { name: "React", category: "Frontend" },
        { name: "SQL", category: "DB" },
        { name: "Docker", category: "DevOps" },
        { name: "AWS", category: "Cloud" },
      ],
      projects: [
        {
          title: "App",
          description: "",
          url: "",
          github_url: "",
          technologies: [],
        },
        {
          title: "CLI",
          description: "",
          url: "",
          github_url: "",
          technologies: [],
        },
      ],
      certifications: [
        {
          name: "AWS Architect",
          issuer: "Amazon",
          issue_date: "2023",
          expiration_date: "",
          credential_url: "",
        },
        {
          name: "CKA",
          issuer: "Linux Foundation",
          issue_date: "2024",
          expiration_date: "",
          credential_url: "",
        },
      ],
    });

    expect(score).toBeGreaterThanOrEqual(95);
  });
});
