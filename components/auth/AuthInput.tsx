"use client";

import React, { useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  helperText?: string;
}

export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, icon, error, helperText, type, className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="w-full space-y-2">
        {label && (
          <div className="flex justify-between items-center">
            <label className="text-[14px] font-semibold text-[#111827]">
              {label}
            </label>
          </div>
        )}
        
        <div className="relative group">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] transition-colors group-focus-within:text-[#4D7C0F]">
              {icon}
            </div>
          )}
          
          <input
            ref={ref}
            type={inputType}
            className={cn(
              "w-full h-[52px] bg-white border rounded-[12px] px-4 transition-all outline-none",
              "placeholder:text-[#9CA3AF] text-[#111827] text-[15px] font-medium",
              "focus:border-[#A8F510] focus:ring-[3px] focus:ring-[#A8F510]/20",
              icon ? "pl-12" : "pl-4",
              isPassword ? "pr-12" : "pr-4",
              error ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/10" : "border-[#E5E7EB]",
              className
            )}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#111827] transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
            </button>
          )}
        </div>

        {error ? (
          <div className="flex items-center gap-1.5 text-[#DC2626] text-[13px] font-medium animate-in fade-in slide-in-from-top-1">
            <AlertCircle size={14} strokeWidth={2} />
            <span>{error}</span>
          </div>
        ) : helperText ? (
          <p className="text-[#6B7280] text-[13px] font-medium opacity-80">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

AuthInput.displayName = "AuthInput";
