"use client";

import React from "react";
import { Mail, ArrowRight } from "lucide-react";
import { AuthButton } from "./AuthButton";
import Link from "next/link";

interface CheckEmailCardProps {
  email: string;
  onOpenApp: () => void;
  onResend: () => void;
  resendCooldown: number;
}

export function CheckEmailCard({
  email,
  onOpenApp,
  onResend,
  resendCooldown,
}: CheckEmailCardProps) {
  return (
    <div className="w-full max-w-[440px] bg-white p-8 sm:p-12 rounded-[24px] border border-[#E5E7EB] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative w-20 h-20 bg-[#F4FDE8] rounded-[24px] flex items-center justify-center text-[#4D7C0F]">
        <Mail size={40} strokeWidth={1.5} />
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#A8F510] border-4 border-white rounded-full flex items-center justify-center shadow-sm">
          <div className="w-1.5 h-1.5 bg-[#111827] rounded-full" />
        </div>
      </div>

      <div className="space-y-3">
        <h1 className="text-[28px] font-bold text-[#111827] tracking-tight">Check your email</h1>
        <div className="text-[#6B7280] text-[15px] leading-relaxed px-2 space-y-1">
          <p>We sent a verification link to</p>
          <p className="text-[#111827] font-bold underline decoration-[#A8F510] decoration-2 underline-offset-4">{email}</p>
          <p className="pt-2 text-[14px]">Click the link to activate your account and put your job search on autopilot.</p>
        </div>
      </div>

      <AuthButton onClick={onOpenApp} showArrow className="h-[52px]">
        Open email app
      </AuthButton>

      <div className="space-y-6 w-full">
        <div className="text-[14px] text-[#6B7280] font-medium">
          Didn't get it?{" "}
          <button
            onClick={onResend}
            disabled={resendCooldown > 0}
            className="text-[#4D7C0F] font-bold hover:underline disabled:opacity-50 disabled:no-underline transition-all"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend email"}
          </button>
        </div>
        
        <p className="text-[11px] text-[#9CA3AF] max-w-[280px] mx-auto leading-relaxed">
          Check your spam folder, too. The link is valid for 24 hours.
        </p>

        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-[14px] font-bold text-[#6B7280] hover:text-[#111827] transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" strokeWidth={3} />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
