"use client";

import * as React from "react";
import { ResumeListItem, deleteResume, getResumesList, uploadAndParseResume } from "@/features/resume/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  File01Icon,
  Download01Icon,
  Delete02Icon,
  Upload04Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";

interface ResumeListProps {
  initialResumes: ResumeListItem[];
}

export function ResumeList({ initialResumes }: ResumeListProps) {
  const router = useRouter();
  const [resumes, setResumes] = React.useState<ResumeListItem[]>(initialResumes);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Keep state synchronized with parent/RSC props
  React.useEffect(() => {
    setResumes(initialResumes);
  }, [initialResumes]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    // Explicit validation check: intercept immediately if file stream is empty / 0 bytes
    if (file.size === 0) {
      setUploadError("Corrupted document stream - File size is 0 bytes.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
      setUploadError("Please upload a PDF or DOCX file.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      // Ensure native File binary contents are fully preservation-appended with filename
      formData.append("file", file, file.name);

      const res = await uploadAndParseResume(formData);
      if (!res.ok) {
        setUploadError(res.error || "Failed to upload and parse resume.");
      } else {
        setUploadError(null);
        // Refresh local state immediately so user sees the newly uploaded resume right away
        const fresh = await getResumesList();
        if (fresh.ok) {
          setResumes(fresh.data);
        }
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload error";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resume?")) return;
    setDeletingId(id);
    const res = await deleteResume(id);
    setDeletingId(null);
    if (res.ok) {
      setResumes((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } else {
      alert(res.error || "Failed to delete resume");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 KB";
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Resumes
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
            Manage your uploaded resumes stored in Supabase private storage and parsed with Gemini AI.
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={handleFileChange}
            onClick={(e) => {
              // Reset value so selecting the same file triggers onChange
              (e.currentTarget as HTMLInputElement).value = "";
            }}
            disabled={isUploading}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-[#ACF417] text-black font-semibold hover:bg-[#ACF417]/90 rounded-xl px-5 py-2.5 shadow-md flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />
                Parsing Resume...
              </>
            ) : (
              <>
                <HugeiconsIcon icon={Upload04Icon} size={16} />
                Upload New Resume
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Uploading progress notification */}
      {isUploading && (
        <div className="flex items-center gap-3 p-4 text-xs rounded-xl bg-[#ACF417]/10 border border-[#ACF417]/30 text-zinc-800 dark:text-zinc-200">
          <HugeiconsIcon icon={Loading03Icon} size={18} className="animate-spin text-[#ACF417] shrink-0" />
          <div>
            <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Uploading & Parsing Resume...</p>
            <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">
              Gemini AI is reading your document and extracting work experiences, skills, and education. This takes approximately 10–15 seconds.
            </p>
          </div>
        </div>
      )}

      {/* Error notification */}
      {uploadError && (
        <div className="flex items-start justify-between gap-3 p-4 text-xs rounded-xl bg-red-950/60 border border-red-800 text-red-200">
          <div className="flex items-start gap-2.5">
            <HugeiconsIcon icon={AlertCircleIcon} size={18} className="shrink-0 text-red-400 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-red-300">Upload Issue</p>
              <p className="text-red-300/90 mt-0.5">{uploadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-red-400 hover:text-red-200 text-xs font-semibold px-2 py-1 rounded"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Resumes List */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <CardTitle className="text-base font-semibold">Uploaded Documents</CardTitle>
          <CardDescription className="text-xs">
            Documents parsed into your job application candidate profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {resumes.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                <HugeiconsIcon icon={File01Icon} size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  No resumes uploaded yet
                </p>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Upload your resume in PDF or DOCX format to populate your profile and enable AI job applications.
                </p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#ACF417] text-black font-semibold hover:bg-[#ACF417]/90 rounded-xl text-xs px-4 py-2 mt-2"
              >
                Upload Resume
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-[#ACF417]/15 border border-[#ACF417]/30 flex items-center justify-center text-[#ACF417] shrink-0">
                      <HugeiconsIcon icon={File01Icon} size={22} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {resume.file_name}
                        </p>
                        <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {resume.file_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                        <span>{formatFileSize(resume.file_size)}</span>
                        <span>•</span>
                        <span>Uploaded {formatDate(resume.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    {/* Status Badge */}
                    {resume.parse_status === "done" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#ACF417]/15 text-[#ACF417] border border-[#ACF417]/30">
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
                        Parsed & Synced
                      </span>
                    ) : resume.parse_status === "parsing" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
                        Parsing...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30">
                        <HugeiconsIcon icon={AlertCircleIcon} size={14} />
                        Failed
                      </span>
                    )}

                    {/* Download Button */}
                    {resume.download_url && (
                      <a
                        href={resume.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-white hover:border-[#ACF417] transition-colors"
                        title="Download / View Resume"
                      >
                        <HugeiconsIcon icon={Download01Icon} size={16} />
                      </a>
                    )}

                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(resume.id)}
                      disabled={deletingId === resume.id}
                      className="text-zinc-400 hover:text-red-400 h-9 w-9"
                      title="Delete Resume"
                    >
                      {deletingId === resume.id ? (
                        <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />
                      ) : (
                        <HugeiconsIcon icon={Delete02Icon} size={16} />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
