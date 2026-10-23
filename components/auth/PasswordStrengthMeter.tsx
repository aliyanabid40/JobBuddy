"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PasswordStrengthMeterProps {
  score: number; // 0 to 4
  hintText?: string;
}

export function PasswordStrengthMeter({ score, hintText }: PasswordStrengthMeterProps) {
  const getSegmentColor = (index: number) => {
    if (index >= score) return "bg-gray-200";
    
    if (score <= 1) return "bg-amber-500";
    if (score <= 3) return "bg-amber-400";
    return "bg-accent";
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 h-1.5 w-full">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-full transition-colors duration-300",
              getSegmentColor(i)
            )}
          />
        ))}
      </div>
      {hintText && (
        <p className={cn(
          "text-[13px] font-medium transition-colors",
          score >= 4 ? "text-accent-text" : "text-muted-foreground"
        )}>
          {hintText}
        </p>
      )}
    </div>
  );
}
