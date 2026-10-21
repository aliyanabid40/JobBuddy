import { ProfileInfo, SkillItem, ExperienceItem, EducationItem, ProjectItem, CertificationItem } from "./schema";

export interface DetailedCompleteness {
  overall: number;
  personal: number;
  summary: number;
  skills: number;
  experience: number;
  education: number;
  projects: number;
  certifications: number;
}

export function calculateDetailedCompleteness(data: {
  profile?: Partial<ProfileInfo> | null;
  skills?: SkillItem[] | null;
  experiences?: ExperienceItem[] | null;
  educations?: EducationItem[] | null;
  projects?: ProjectItem[] | null;
  certifications?: CertificationItem[] | null;
}): DetailedCompleteness {
  const p = data.profile || {};

  // 1. Personal info (100% max)
  let personal = 0;
  if (p.full_name?.trim()) personal += 30;
  if (p.email?.trim()) personal += 30;
  if (p.phone?.trim()) personal += 15;
  if (p.location?.trim()) personal += 15;
  if (p.github_url?.trim() || p.linkedin_url?.trim() || p.website_url?.trim()) personal += 10;
  personal = Math.min(100, personal);

  // 2. Summary
  let summary = 0;
  const sumLen = (p.summary || "").trim().length;
  if (sumLen >= 80) summary = 100;
  else if (sumLen >= 40) summary = 75;
  else if (sumLen >= 15) summary = 45;
  else if (sumLen > 0) summary = 20;

  // 3. Skills
  const skillCount = (data.skills || []).length;
  let skills = 0;
  if (skillCount >= 6) skills = 100;
  else if (skillCount >= 4) skills = 85;
  else if (skillCount >= 2) skills = 60;
  else if (skillCount >= 1) skills = 35;

  // 4. Experience
  const expList = data.experiences || [];
  let experience = 0;
  if (expList.length >= 2) {
    const hasBul = expList.some((e) => (e.responsibilities || []).length > 0);
    experience = hasBul ? 100 : 90;
  } else if (expList.length === 1) {
    const hasBul = (expList[0].responsibilities || []).length > 0;
    experience = hasBul ? 95 : 65;
  }

  // 5. Education
  const eduList = data.educations || [];
  let education = 0;
  if (eduList.length >= 1) {
    const hasDegree = eduList.some((ed) => Boolean(ed.degree?.trim()));
    education = hasDegree ? 100 : 75;
  }

  // 6. Projects
  const projCount = (data.projects || []).length;
  let projects = 0;
  if (projCount >= 2) projects = 100;
  else if (projCount === 1) projects = 60;

  // 7. Certifications
  const certCount = (data.certifications || []).length;
  let certifications = 0;
  if (certCount >= 2) certifications = 100;
  else if (certCount === 1) certifications = 75;

  // Overall Weighted Score (0-100)
  // Personal (20%), Summary (15%), Skills (15%), Experience (25%), Education (15%), Projects (5%), Certifications (5%)
  const weighted =
    personal * 0.2 +
    summary * 0.15 +
    skills * 0.15 +
    experience * 0.25 +
    education * 0.15 +
    projects * 0.05 +
    certifications * 0.05;

  const overall = Math.round(Math.min(100, Math.max(0, weighted)));

  return {
    overall,
    personal,
    summary,
    skills,
    experience,
    education,
    projects,
    certifications,
  };
}

export function calculateProfileCompleteness(data: {
  profile?: Partial<ProfileInfo> | null;
  skills?: SkillItem[] | null;
  experiences?: ExperienceItem[] | null;
  educations?: EducationItem[] | null;
  projects?: ProjectItem[] | null;
  certifications?: CertificationItem[] | null;
}): number {
  return calculateDetailedCompleteness(data).overall;
}
