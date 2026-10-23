import React from "react";
import { AlertCircle } from "lucide-react";

interface FormErrorBannerProps {
  message: string | null;
}

export function FormErrorBanner({ message }: FormErrorBannerProps) {
  if (!message) return null;

  return (
    <div className="flex gap-3 p-4 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl text-[#DC2626] text-[14px] animate-in fade-in slide-in-from-top-2">
      <AlertCircle className="w-5 h-5 shrink-0" strokeWidth={2} />
      <p className="font-medium leading-relaxed">{message}</p>
    </div>
  );
}
