import { z } from "zod";

/** Coerces null/undefined → "" so Gemini nulls don't break Zod */
const safeStr = z.union([z.string(), z.null(), z.undefined()]).transform((v) => v ?? "");
/** Coerces null/undefined → false */
const safeBool = z.union([z.boolean(), z.null(), z.undefined()]).transform((v) => v ?? false);
/** Coerces null/undefined → [] */
const safeStrArray = z
  .union([z.array(z.union([z.string(), z.null()])), z.null(), z.undefined()])
  .transform((v) => (v ?? []).map((s) => (s == null ? "" : s)).filter((s) => s.trim().length > 0));

export const ProfileInfoSchema = z.object({
  full_name: safeStr,
  email: safeStr,
  phone: safeStr,
  location: safeStr,
  github_url: safeStr,
  linkedin_url: safeStr,
  website_url: safeStr,
  summary: safeStr,
});

export const SkillItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Skill name is required"),
  category: safeStr.transform((v) => v || "General"),
});

export const ExperienceItemSchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1, "Company name is required"),
  title: z.string().min(1, "Job title is required"),
  location: safeStr,
  start_date: safeStr,
  end_date: safeStr,
  is_current: safeBool,
  description: safeStr,
  responsibilities: safeStrArray,
});

export const EducationItemSchema = z.object({
  id: z.string().optional(),
  institution: z.string().min(1, "Institution is required"),
  degree: safeStr,
  field_of_study: safeStr,
  start_date: safeStr,
  end_date: safeStr,
  gpa: safeStr,
});

export const ProjectItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Project title is required"),
  description: safeStr,
  url: safeStr,
  github_url: safeStr,
  technologies: safeStrArray,
});

export const CertificationItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Certification name is required"),
  issuer: safeStr,
  issue_date: safeStr,
  expiration_date: safeStr,
  credential_url: safeStr,
});

const safeSkillItem = z
  .object({
    id: z.string().optional(),
    name: safeStr,
    category: safeStr.transform((v) => v || "General"),
  })
  .passthrough();

const safeExperienceItem = z
  .object({
    id: z.string().optional(),
    company: safeStr,
    title: safeStr,
    location: safeStr,
    start_date: safeStr,
    end_date: safeStr,
    is_current: safeBool,
    description: safeStr,
    responsibilities: safeStrArray,
  })
  .passthrough();

const safeEducationItem = z
  .object({
    id: z.string().optional(),
    institution: safeStr,
    degree: safeStr,
    field_of_study: safeStr,
    start_date: safeStr,
    end_date: safeStr,
    gpa: safeStr,
  })
  .passthrough();

const safeProjectItem = z
  .object({
    id: z.string().optional(),
    title: safeStr,
    description: safeStr,
    url: safeStr,
    github_url: safeStr,
    technologies: safeStrArray,
  })
  .passthrough();

const safeCertificationItem = z
  .object({
    id: z.string().optional(),
    name: safeStr,
    issuer: safeStr,
    issue_date: safeStr,
    expiration_date: safeStr,
    credential_url: safeStr,
  })
  .passthrough();

/** Top-level parsed resume schema — all arrays default to [] on missing/null/undefined */
export const ParsedResumeSchema = z.object({
  profile: z
    .union([ProfileInfoSchema, z.null(), z.undefined()])
    .transform((p) => p ?? {
      full_name: "",
      email: "",
      phone: "",
      location: "",
      github_url: "",
      linkedin_url: "",
      website_url: "",
      summary: "",
    }),
  skills: z
    .array(z.unknown())
    .nullish()
    .transform((rawArr) => {
      if (!Array.isArray(rawArr)) return [];
      return rawArr
        .map((item) => {
          const parsed = safeSkillItem.safeParse(item);
          return parsed.success && parsed.data.name.trim().length > 0 ? parsed.data : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    }),
  experiences: z
    .array(z.unknown())
    .nullish()
    .transform((rawArr) => {
      if (!Array.isArray(rawArr)) return [];
      return rawArr
        .map((item) => {
          const parsed = safeExperienceItem.safeParse(item);
          return parsed.success && parsed.data.company.trim().length > 0 ? parsed.data : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    }),
  educations: z
    .array(z.unknown())
    .nullish()
    .transform((rawArr) => {
      if (!Array.isArray(rawArr)) return [];
      return rawArr
        .map((item) => {
          const parsed = safeEducationItem.safeParse(item);
          return parsed.success && parsed.data.institution.trim().length > 0 ? parsed.data : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    }),
  projects: z
    .array(z.unknown())
    .nullish()
    .transform((rawArr) => {
      if (!Array.isArray(rawArr)) return [];
      return rawArr
        .map((item) => {
          const parsed = safeProjectItem.safeParse(item);
          return parsed.success && parsed.data.title.trim().length > 0 ? parsed.data : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    }),
  certifications: z
    .array(z.unknown())
    .nullish()
    .transform((rawArr) => {
      if (!Array.isArray(rawArr)) return [];
      return rawArr
        .map((item) => {
          const parsed = safeCertificationItem.safeParse(item);
          return parsed.success && parsed.data.name.trim().length > 0 ? parsed.data : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    }),
});

export type ProfileInfo = z.infer<typeof ProfileInfoSchema>;
export type SkillItem = z.infer<typeof SkillItemSchema>;
export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;
export type EducationItem = z.infer<typeof EducationItemSchema>;
export type ProjectItem = z.infer<typeof ProjectItemSchema>;
export type CertificationItem = z.infer<typeof CertificationItemSchema>;
export type ParsedResumeData = z.infer<typeof ParsedResumeSchema>;

export interface FullProfileData {
  profile: ProfileInfo;
  skills: SkillItem[];
  experiences: ExperienceItem[];
  educations: EducationItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  completeness: number;
}
