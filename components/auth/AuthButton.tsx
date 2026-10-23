"use client";

import React from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  children: React.ReactNode;
  showArrow?: boolean;
}

export function AuthButton({ 
  isLoading, 
  children, 
  showArrow = false,
  className,
  ...props 
}: AuthButtonProps) {
  return (
    <button
      disabled={isLoading || props.disabled}
      className={cn(
        "w-full h-[52px] flex items-center justify-center gap-2 px-6 rounded-[12px] font-semibold transition-all",
        "bg-[#A8F510] text-[#0F1A05] hover:bg-[#96E00B] active:bg-[#7CCB0F]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#A8F510]",
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[15px]">Please wait...</span>
        </>
      ) : (
        <>
          <span className="text-[15px]">{children}</span>
          {showArrow && <ArrowRight className="w-4 h-4" strokeWidth={3} />}
        </>
      )}
    </button>
  );
}
