"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { uploadAndParseResume } from "@/features/resume/actions";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Upload04Icon,
  File01Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  SparklesIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";

interface OnboardingDialogProps {
  initialOnboardingDone: boolean;
}

type StepStatus = "idle" | "uploading" | "extracting" | "analyzing" | "saving" | "complete" | "error";

export function OnboardingDialog({ initialOnboardingDone }: OnboardingDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(!initialOnboardingDone);
  const [file, setFile] = React.useState<File | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [status, setStatus] = React.useState<StepStatus>("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // If user is already onboarded, don't show
  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setErrorMessage(null);

    // Explicit validation check: intercept immediately if file stream is empty / 0 bytes
    if (selectedFile.size === 0) {
      setErrorMessage("Corrupted document stream - File size is 0 bytes.");
      return;
    }

    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
      setErrorMessage("Please select a PDF or DOCX resume file.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage("File exceeds the 10MB size limit.");
      return;
    }
    setFile(selectedFile);
  };

  const handleUploadAndParse = async () => {
    if (!file) return;

    if (file.size === 0) {
      setStatus("error");
      setErrorMessage("Corrupted document stream - File size is 0 bytes.");
      return;
    }

    setErrorMessage(null);
    setStatus("uploading");

    try {
      // Stage timer simulation for UX feedback during single server call
      const timer1 = setTimeout(() => setStatus("extracting"), 800);
      const timer2 = setTimeout(() => setStatus("analyzing"), 2000);
      const timer3 = setTimeout(() => setStatus("saving"), 4500);

      const formData = new FormData();
      // Ensure native File binary contents are fully preservation-appended with filename
      formData.append("file", file, file.name);

      const result = await uploadAndParseResume(formData);

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (!result.ok) {
        setStatus("error");
        setErrorMessage(result.error || "Failed to process resume. Please try again.");
        return;
      }

      setStatus("complete");
      setTimeout(() => {
        setIsOpen(false);
        router.refresh();
        router.push("/dashboard/profile");
      }, 1200);
    } catch (err: unknown) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
    }
  };

  const isProcessing = status !== "idle" && status !== "error";

  const getStepLabel = () => {
    switch (status) {
      case "uploading":
        return "1/4 Uploading resume to secure vault...";
      case "extracting":
        return "2/4 Extracting document content...";
      case "analyzing":
        return "3/4 Gemini AI analyzing your experience & skills...";
      case "saving":
        return "4/4 Populating your profile...";
      case "complete":
        return "Profile ready! Redirecting...";
      default:
        return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-xl border-zinc-800 bg-zinc-950 p-6 md:p-8 text-white shadow-2xl rounded-2xl"
      >
        <DialogHeader className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ACF417]/10 border border-[#ACF417]/30 text-[#ACF417] text-xs font-medium w-fit">
            <HugeiconsIcon icon={SparklesIcon} size={14} />
            <span>Welcome to JobBuddy</span>
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight text-white">
            Upload your resume to get started
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm leading-relaxed">
            Upload your current resume (PDF or DOCX). Our AI will analyze your work experience,
            skills, and education to automatically build your application profile.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !isProcessing && inputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
              dragActive
                ? "border-[#ACF417] bg-[#ACF417]/10 ring-2 ring-[#ACF417]/50"
                : file
                ? "border-[#ACF417]/60 bg-zinc-900/80"
                : "border-zinc-800 hover:border-[#ACF417]/40 bg-zinc-900/40 hover:bg-zinc-900/60"
            } ${isProcessing ? "pointer-events-none opacity-80" : ""}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleFileChange}
              onClick={(e) => {
                e.stopPropagation();
                (e.currentTarget as HTMLInputElement).value = "";
              }}
              disabled={isProcessing}
            />

            {file ? (
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-[#ACF417]/20 border border-[#ACF417]/40 flex items-center justify-center text-[#ACF417]">
                  <HugeiconsIcon icon={File01Icon} size={24} />
                </div>
                <div className="text-left">
                  <p className="font-medium text-zinc-100 text-sm max-w-xs truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • Ready to parse
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <div className="mx-auto h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                  <HugeiconsIcon icon={Upload04Icon} size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">
                    Drop your resume here, or{" "}
                    <span className="text-[#ACF417] underline underline-offset-4">browse</span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Supports PDF or DOCX (up to 10MB)</p>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-red-950/60 border border-red-800/80 text-red-300">
              <HugeiconsIcon icon={AlertCircleIcon} size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Progress Indicator */}
          {isProcessing && (
            <div className="space-y-2 py-2">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                <span className="flex items-center gap-2 text-[#ACF417]">
                  {status === "complete" ? (
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-[#ACF417]" />
                  ) : (
                    <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin text-[#ACF417]" />
                  )}
                  {getStepLabel()}
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#ACF417] h-full transition-all duration-500 rounded-full"
                  style={{
                    width:
                      status === "uploading"
                        ? "25%"
                        : status === "extracting"
                        ? "50%"
                        : status === "analyzing"
                        ? "75%"
                        : status === "saving"
                        ? "90%"
                        : "100%",
                  }}
                />
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2 flex flex-col gap-2">
            <Button
              type="button"
              disabled={!file || isProcessing}
              onClick={handleUploadAndParse}
              className="w-full py-6 font-semibold text-black bg-[#ACF417] hover:bg-[#ACF417]/90 transition-all rounded-xl shadow-lg shadow-[#ACF417]/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <HugeiconsIcon icon={Loading03Icon} size={18} className="animate-spin" />
                  Processing Resume with AI...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <HugeiconsIcon icon={SparklesIcon} size={18} />
                  Analyze Resume & Set Up Profile
                </span>
              )}
            </Button>
            <p className="text-[11px] text-center text-zinc-500">
              You must upload a resume before continuing. You can edit any details in your profile later.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
