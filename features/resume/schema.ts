import { z } from "zod";

export const ProfileInfoSchema = z.object({
  full_name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  location: z.string().default(""),
  github_url: z.string().default(""),
  linkedin_url: z.string().default(""),
  website_url: z.string().default(""),
  summary: z.string().default(""),
});

export const SkillItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Skill name is required"),
  category: z.string().default("General"),
});

export const ExperienceItemSchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1, "Company name is required"),
  title: z.string().min(1, "Job title is required"),
  location: z.string().default(""),
  start_date: z.string().default(""),
  end_date: z.string().default(""),
  is_current: z.boolean().default(false),
  description: z.string().default(""),
  responsibilities: z.array(z.string()).default([]),
});

export const EducationItemSchema = z.object({
  id: z.string().optional(),
  institution: z.string().min(1, "Institution is required"),
  degree: z.string().default(""),
  field_of_study: z.string().default(""),
  start_date: z.string().default(""),
  end_date: z.string().default(""),
  gpa: z.string().default(""),
});

export const ProjectItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Project title is required"),
  description: z.string().default(""),
  url: z.string().default(""),
  github_url: z.string().default(""),
  technologies: z.array(z.string()).default([]),
});

export const CertificationItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Certification name is required"),
  issuer: z.string().default(""),
  issue_date: z.string().default(""),
  expiration_date: z.string().default(""),
  credential_url: z.string().default(""),
});

export const ParsedResumeSchema = z.object({
  profile: ProfileInfoSchema,
  skills: z.array(SkillItemSchema).default([]),
  experiences: z.array(ExperienceItemSchema).default([]),
  educations: z.array(EducationItemSchema).default([]),
  projects: z.array(ProjectItemSchema).default([]),
  certifications: z.array(CertificationItemSchema).default([]),
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
