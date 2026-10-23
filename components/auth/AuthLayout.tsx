import React from "react";
import { BrandPanel } from "./BrandPanel";
import { AuthLogo } from "./AuthLogo";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex bg-white">
      {/* Desktop Left Panel */}
      <BrandPanel />
      
      <main className="flex-1 flex flex-col p-6 sm:p-12 lg:p-20 relative overflow-y-auto bg-[#F7F7F8]">
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="lg:hidden w-full flex flex-col items-center mb-10 pt-4">
          <AuthLogo className="mb-8" />
          
          <div className="w-full bg-gradient-to-br from-[#F4FDE8] to-white p-8 rounded-[24px] border border-[#E5E7EB] shadow-sm text-center space-y-3">
             <div className="inline-flex items-center gap-2 text-[10px] font-bold text-[#4D7C0F] uppercase tracking-[0.1em] opacity-80">
              <span className="w-3 h-[1px] bg-[#4D7C0F]" />
              Your next chapter
            </div>
            <h2 className="text-2xl font-bold text-[#111827] leading-tight px-4">
              Let AI find and apply to your <span className="text-[#7CCB0F]">dream job.</span>
            </h2>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>

        {/* Mobile Footer */}
        <div className="mt-12 pt-8 lg:hidden text-center border-t border-[#E5E7EB]">
          <p className="text-[11px] text-[#6B7280] opacity-60">
            Your job search, always private and secure.
          </p>
        </div>
      </main>
    </div>
  );
}
