import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AuthLogoProps {
  className?: string;
  isMobile?: boolean;
}

export function AuthLogo({ className, isMobile }: AuthLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative w-10 h-10 bg-[#0B0B0B] rounded-xl flex items-center justify-center overflow-hidden shadow-sm">
        <Image
          src="/jobbuddy-logo.png"
          alt="JobBuddy"
          width={24}
          height={24}
          className="object-contain"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold tracking-tight text-[#111827]">
          JobBuddy
        </span>
        <span className="bg-[#A8F510] text-[#111827] text-[10px] font-black px-1.5 py-0.5 rounded-[6px] uppercase tracking-wider leading-none">
          AI
        </span>
      </div>
    </div>
  );
}
