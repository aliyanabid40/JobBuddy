import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#0a0d14]">
      {/* Left branding pane */}
      <div className="relative hidden md:flex md:w-1/2 lg:w-5/12 flex-col justify-between p-10 lg:p-14 bg-gradient-to-br from-[#0a0d14] via-[#0d1322] to-[#07090e] border-r border-white/5 overflow-hidden">
        {/* Subtle radial glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 30% 40%, rgba(59, 130, 246, 0.14) 0%, transparent 70%)",
          }}
        />

        {/* Top brand badge */}
        <div className="relative z-10 flex items-center">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur-md">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white">
              AI
            </span>
            <span className="text-xs font-semibold tracking-wide text-white">
              Job Agent
            </span>
          </div>
        </div>

        {/* Middle copy */}
        <div className="relative z-10 my-auto py-12 max-w-md">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight mb-4">
            Apply smarter, not harder
          </h1>
          <p className="text-zinc-400 text-sm lg:text-base leading-relaxed">
            Track applications, tailor resumes, and let AI handle the repetitive
            work so you can focus on landing the right role.
          </p>
        </div>

        {/* Bottom subtle note */}
        <div className="relative z-10">
          <p className="text-xs text-zinc-500 font-normal">
            AI-powered job search and application management.
          </p>
        </div>
      </div>

      {/* Right form pane */}
      <div className="flex-1 flex flex-col justify-center items-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile-only brand badge */}
          <div className="mb-6 flex md:hidden items-center justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">
                AI
              </span>
              <span className="text-xs font-semibold text-zinc-800">
                Job Agent
              </span>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
