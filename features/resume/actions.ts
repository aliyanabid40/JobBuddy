"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractResumeText, parseResumeWithGemini } from "@/lib/ai/resume-parser";
import {
  ProfileInfoSchema,
  SkillItemSchema,
  ExperienceItemSchema,
  EducationItemSchema,
  ProjectItemSchema,
  CertificationItemSchema,
  FullProfileData,
  ParsedResumeData,
} from "./schema";
import { calculateProfileCompleteness } from "./completeness";
import { z } from "zod";

export type ActionResult<T = unknown> =
  | { ok: true; data: T; error?: never }
  | { ok: false; error: string; data?: never };

/**
 * Handle resume upload, Supabase storage persistence, text extraction,
 * Gemini AI structured parsing, and database profile hydration.
 */
export async function uploadAndParseResume(formData: FormData): Promise<ActionResult<{ resumeId: string; parsed: ParsedResumeData }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "Unauthorized. Please log in." };
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return { ok: false, error: "No file provided." };
    }

    const fileName = file.name;
    const fileSize = file.size;
    const lowerName = fileName.toLowerCase();

    let fileType: "pdf" | "docx";
    if (lowerName.endsWith(".pdf")) {
      fileType = "pdf";
    } else if (lowerName.endsWith(".docx")) {
      fileType = "docx";
    } else {
      return { ok: false, error: "Unsupported file format. Please upload a PDF or DOCX file." };
    }

    // Limit to 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (fileSize > MAX_SIZE) {
      return { ok: false, error: "File exceeds maximum size limit of 10MB." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Upload to Supabase Storage using adminClient to ensure bucket exists and bypass Storage RLS barriers
    const adminClient = createAdminClient();
    try {
      const { data: buckets } = await adminClient.storage.listBuckets();
      if (!buckets?.some((b) => b.name === "resumes")) {
        await adminClient.storage.createBucket("resumes", {
          public: false,
          fileSizeLimit: 10485760,
        });
      }
    } catch {
      // Bucket check error ignored
    }

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${user.id}/${Date.now()}-${cleanFileName}`;

    const { error: uploadError } = await adminClient.storage
      .from("resumes")
      .upload(storagePath, buffer, {
        contentType: file.type || (fileType === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        upsert: false,
      });

    if (uploadError) {
      return { ok: false, error: `Storage upload failed: ${uploadError.message}` };
    }

    // 2. Create record in resumes table
    let resumeInsertRes = await supabase
      .from("resumes")
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        file_type: fileType,
        file_name: fileName,
        file_size: fileSize,
        parse_status: "parsing",
      })
      .select("id")
      .single();

    if (resumeInsertRes.error && resumeInsertRes.error.message?.includes("file_name")) {
      resumeInsertRes = await supabase
        .from("resumes")
        .insert({
          user_id: user.id,
          storage_path: storagePath,
          file_type: fileType,
          parse_status: "parsing",
        })
        .select("id")
        .single();
    }

    if (resumeInsertRes.error || !resumeInsertRes.data) {
      return { ok: false, error: `Failed to register resume: ${resumeInsertRes.error?.message}` };
    }

    const resumeId = resumeInsertRes.data.id;

    // 3. Extract text
    let extractedText = "";
    try {
      extractedText = await extractResumeText(buffer, fileType);
    } catch (extractErr: unknown) {
      await supabase
        .from("resumes")
        .update({ parse_status: "failed" })
        .eq("id", resumeId);
      const msg = extractErr instanceof Error ? extractErr.message : "Text extraction failed.";
      return { ok: false, error: msg };
    }

    // 4. Parse with Gemini AI
    let parsedData: ParsedResumeData;
    try {
      parsedData = await parseResumeWithGemini(extractedText);
    } catch (parseErr: unknown) {
      await supabase
        .from("resumes")
        .update({ parse_status: "failed" })
        .eq("id", resumeId);
      const msg = parseErr instanceof Error ? parseErr.message : "AI parsing failed.";
      return { ok: false, error: msg };
    }

    // 5. Hydrate database tables
    // Update profile
    const profileUpdate = {
      full_name: parsedData.profile.full_name || undefined,
      email: parsedData.profile.email || user.email || undefined,
      phone: parsedData.profile.phone || undefined,
      location: parsedData.profile.location || undefined,
      github_url: parsedData.profile.github_url || undefined,
      linkedin_url: parsedData.profile.linkedin_url || undefined,
      website_url: parsedData.profile.website_url || undefined,
      summary: parsedData.profile.summary || undefined,
      onboarding_done: true,
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    // Replace skills
    if (parsedData.skills && parsedData.skills.length > 0) {
      await supabase.from("skills").delete().eq("user_id", user.id);
      const skillRows = parsedData.skills.map((s) => ({
        user_id: user.id,
        name: s.name,
        category: s.category || "General",
      }));
      await supabase.from("skills").insert(skillRows);
    }

    // Replace experiences
    if (parsedData.experiences && parsedData.experiences.length > 0) {
      await supabase.from("experiences").delete().eq("user_id", user.id);
      const expRows = parsedData.experiences.map((e) => ({
        user_id: user.id,
        company: e.company,
        title: e.title,
        location: e.location || "",
        start_date: e.start_date || "",
        end_date: e.end_date || "",
        is_current: Boolean(e.is_current),
        description: e.description || "",
        responsibilities: e.responsibilities || [],
      }));
      await supabase.from("experiences").insert(expRows);
    }

    // Replace educations
    if (parsedData.educations && parsedData.educations.length > 0) {
      await supabase.from("educations").delete().eq("user_id", user.id);
      const eduRows = parsedData.educations.map((ed) => ({
        user_id: user.id,
        institution: ed.institution,
        degree: ed.degree || "",
        field_of_study: ed.field_of_study || "",
        start_date: ed.start_date || "",
        end_date: ed.end_date || "",
        gpa: ed.gpa || "",
      }));
      await supabase.from("educations").insert(eduRows);
    }

    // Replace projects
    if (parsedData.projects && parsedData.projects.length > 0) {
      await supabase.from("projects").delete().eq("user_id", user.id);
      const projRows = parsedData.projects.map((p) => ({
        user_id: user.id,
        title: p.title,
        description: p.description || "",
        url: p.url || "",
        github_url: p.github_url || "",
        technologies: p.technologies || [],
      }));
      await supabase.from("projects").insert(projRows);
    }

    // Replace certifications
    if (parsedData.certifications && parsedData.certifications.length > 0) {
      await supabase.from("certifications").delete().eq("user_id", user.id);
      const certRows = parsedData.certifications.map((c) => ({
        user_id: user.id,
        name: c.name,
        issuer: c.issuer || "",
        issue_date: c.issue_date || "",
        expiration_date: c.expiration_date || "",
        credential_url: c.credential_url || "",
      }));
      await supabase.from("certifications").insert(certRows);
    }

    // 6. Mark resume parsing as done
    await supabase
      .from("resumes")
      .update({ parse_status: "done" })
      .eq("id", resumeId);

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/resume");

    return {
      ok: true,
      data: {
        resumeId,
        parsed: parsedData,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected upload error";
    return { ok: false, error: message };
  }
}

/**
 * Fetch full profile information including all sections and completeness score
 */
export async function getFullProfile(): Promise<ActionResult<FullProfileData>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "Unauthorized" };
    }

    const [
      { data: profile },
      { data: skills },
      { data: experiences },
      { data: educations },
      { data: projects },
      { data: certifications },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("skills").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("experiences").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("educations").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("certifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    const profileData = {
      full_name: profile?.full_name || "",
      email: profile?.email || user.email || "",
      phone: profile?.phone || "",
      location: profile?.location || "",
      github_url: profile?.github_url || "",
      linkedin_url: profile?.linkedin_url || "",
      website_url: profile?.website_url || "",
      summary: profile?.summary || "",
    };

    const completeness = calculateProfileCompleteness({
      profile: profileData,
      skills: skills || [],
      experiences: experiences || [],
      educations: educations || [],
      projects: projects || [],
      certifications: certifications || [],
    });

    return {
      ok: true,
      data: {
        profile: profileData,
        skills: skills || [],
        experiences: experiences || [],
        educations: educations || [],
        projects: projects || [],
        certifications: certifications || [],
        completeness,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load profile";
    return { ok: false, error: message };
  }
}

/**
 * Update personal profile information
 */
export async function updatePersonalInfo(data: unknown): Promise<ActionResult<{ success: boolean }>> {
  try {
    const parsed = ProfileInfoSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Invalid profile data" };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        location: parsed.data.location,
        github_url: parsed.data.github_url,
        linkedin_url: parsed.data.linkedin_url,
        website_url: parsed.data.website_url,
        summary: parsed.data.summary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath("/dashboard/profile");
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update profile";
    return { ok: false, error: message };
  }
}

/**
 * Save all skills for the user
 */
export async function saveSkills(skills: unknown): Promise<ActionResult<{ success: boolean }>> {
  try {
    const schema = z.array(SkillItemSchema);
    const parsed = schema.safeParse(skills);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Invalid skills data" };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Unauthorized" };

    // Delete existing and insert new
    await supabase.from("skills").delete().eq("user_id", user.id);

    if (parsed.data.length > 0) {
      const rows = parsed.data.map((s) => ({
        user_id: user.id,
        name: s.name.trim(),
        category: s.category?.trim() || "General",
      }));
      const { error } = await supabase.from("skills").insert(rows);
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/dashboard/profile");
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save skills";
    return { ok: false, error: msg };
  }
}

/**
 * Save all experiences for the user
 */
export async function saveExperiences(experiences: unknown): Promise<ActionResult<{ success: boolean }>> {
  try {
    const schema = z.array(ExperienceItemSchema);
    const parsed = schema.safeParse(experiences);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Invalid experiences data" };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Unauthorized" };

    await supabase.from("experiences").delete().eq("user_id", user.id);

    if (parsed.data.length > 0) {
      const rows = parsed.data.map((e) => ({
        user_id: user.id,
        company: e.company.trim(),
        title: e.title.trim(),
        location: e.location?.trim() || "",
        start_date: e.start_date?.trim() || "",
        end_date: e.end_date?.trim() || "",
        is_current: Boolean(e.is_current),
        description: e.description?.trim() || "",
        responsibilities: e.responsibilities || [],
      }));
      const { error } = await supabase.from("experiences").insert(rows);
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/dashboard/profile");
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save experiences";
    return { ok: false, error: msg };
  }
}

/**
 * Save all educations for the user
 */
export async function saveEducations(educations: unknown): Promise<ActionResult<{ success: boolean }>> {
  try {
    const schema = z.array(EducationItemSchema);
    const parsed = schema.safeParse(educations);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Invalid education data" };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Unauthorized" };

    await supabase.from("educations").delete().eq("user_id", user.id);

    if (parsed.data.length > 0) {
      const rows = parsed.data.map((ed) => ({
        user_id: user.id,
        institution: ed.institution.trim(),
        degree: ed.degree?.trim() || "",
        field_of_study: ed.field_of_study?.trim() || "",
        start_date: ed.start_date?.trim() || "",
        end_date: ed.end_date?.trim() || "",
        gpa: ed.gpa?.trim() || "",
      }));
      const { error } = await supabase.from("educations").insert(rows);
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/dashboard/profile");
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save education";
    return { ok: false, error: msg };
  }
}

/**
 * Save all projects for the user
 */
export async function saveProjects(projects: unknown): Promise<ActionResult<{ success: boolean }>> {
  try {
    const schema = z.array(ProjectItemSchema);
    const parsed = schema.safeParse(projects);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Invalid projects data" };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Unauthorized" };

    await supabase.from("projects").delete().eq("user_id", user.id);

    if (parsed.data.length > 0) {
      const rows = parsed.data.map((p) => ({
        user_id: user.id,
        title: p.title.trim(),
        description: p.description?.trim() || "",
        url: p.url?.trim() || "",
        github_url: p.github_url?.trim() || "",
        technologies: p.technologies || [],
      }));
      const { error } = await supabase.from("projects").insert(rows);
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/dashboard/profile");
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save projects";
    return { ok: false, error: msg };
  }
}

/**
 * Save all certifications for the user
 */
export async function saveCertifications(certifications: unknown): Promise<ActionResult<{ success: boolean }>> {
  try {
    const schema = z.array(CertificationItemSchema);
    const parsed = schema.safeParse(certifications);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Invalid certifications data" };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Unauthorized" };

    await supabase.from("certifications").delete().eq("user_id", user.id);

    if (parsed.data.length > 0) {
      const rows = parsed.data.map((c) => ({
        user_id: user.id,
        name: c.name.trim(),
        issuer: c.issuer?.trim() || "",
        issue_date: c.issue_date?.trim() || "",
        expiration_date: c.expiration_date?.trim() || "",
        credential_url: c.credential_url?.trim() || "",
      }));
      const { error } = await supabase.from("certifications").insert(rows);
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/dashboard/profile");
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save certifications";
    return { ok: false, error: msg };
  }
}

export interface ResumeListItem {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  parse_status: string;
  created_at: string;
  download_url: string | null;
}

/**
 * Get all uploaded resumes for the current user with signed download URLs
 */
export async function getResumesList(): Promise<ActionResult<ResumeListItem[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "Unauthorized" };
    }

    const { data: rows, error } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { ok: false, error: error.message };
    }

    // Generate signed download URLs
    const items: ResumeListItem[] = await Promise.all(
      (rows || []).map(async (row) => {
        let downloadUrl: string | null = null;
        try {
          const adminClient = createAdminClient();
          const { data: signData } = await adminClient.storage
            .from("resumes")
            .createSignedUrl(row.storage_path, 3600); // 1 hour
          downloadUrl = signData?.signedUrl || null;
        } catch {
          downloadUrl = null;
        }

        return {
          id: row.id,
          file_name: row.file_name || row.storage_path.split("/").pop() || "resume",
          file_type: row.file_type,
          file_size: Number(row.file_size || 0),
          parse_status: row.parse_status,
          created_at: row.created_at,
          download_url: downloadUrl,
        };
      })
    );

    return { ok: true, data: items };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to retrieve resumes";
    return { ok: false, error: msg };
  }
}

/**
 * Delete a resume record and its storage object
 */
export async function deleteResume(resumeId: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Unauthorized" };

    const { data: row } = await supabase
      .from("resumes")
      .select("storage_path")
      .eq("id", resumeId)
      .eq("user_id", user.id)
      .single();

    if (row?.storage_path) {
      try {
        const adminClient = createAdminClient();
        await adminClient.storage.from("resumes").remove([row.storage_path]);
      } catch {
        // Storage removal error handled
      }
    }

    const { error } = await supabase
      .from("resumes")
      .delete()
      .eq("id", resumeId)
      .eq("user_id", user.id);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/dashboard/resume");
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete resume";
    return { ok: false, error: msg };
  }
}
