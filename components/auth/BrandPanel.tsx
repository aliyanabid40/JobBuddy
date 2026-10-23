import React from "react";
import { AuthLogo } from "./AuthLogo";
import { Check, Briefcase, Bookmark, Sparkles } from "lucide-react";

export function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col w-1/2 bg-gradient-to-br from-[#F4FDE8] to-white p-16 relative overflow-hidden border-r border-[#E5E7EB]">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#111827 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
      
      {/* Blurred lime blobs */}
      <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] bg-[#A8F510] opacity-[0.1] blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[300px] h-[300px] bg-[#A8F510] opacity-[0.12] blur-[80px] rounded-full pointer-events-none" />

      {/* Header Logo */}
      <AuthLogo className="relative z-20 mb-20" />

      <div className="flex-1 space-y-12 relative z-10 pl-4">
        <div className="max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold text-[#4D7C0F] uppercase tracking-[0.2em]">
            <Sparkles size={14} className="text-[#A8F510]" fill="currentColor" />
            YOUR NEXT CHAPTER, ON AUTOPILOT
          </div>
          
          <h1 className="text-[44px] font-semibold text-[#111827] leading-[52px]">
            Let AI find and apply to your <span className="text-[#7CCB0F]">dream job.</span>
          </h1>
          
          <p className="text-[#6B7280] text-[15px] leading-[1.6] max-w-[420px]">
            Less searching. More possibilities. Your personal AI agent takes the
            busywork out of your job search.
          </p>
        </div>

        {/* Floating Preview Cards */}
        <div className="relative py-12 ml-4">
          {/* Mini Job Card */}
          <div className="w-[380px] bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative z-20">
            <div className="flex justify-between items-start mb-5">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-[#0B0B0B] rounded-lg flex items-center justify-center text-white font-bold text-lg">
                  a
                </div>
                <div>
                  <h3 className="font-semibold text-[#111827] text-[16px]">Product Designer</h3>
                  <p className="text-[12px] text-[#6B7280]">Arc • Remote • Full-time</p>
                </div>
              </div>
              <div className="text-[#9CA3AF]">
                <Bookmark size={18} />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-[#6B7280]">$120k - $160k / year</span>
                <span className="font-bold text-[#4D7C0F]">92% Match</span>
              </div>
              
              <div className="w-full h-[6px] bg-[#F3F4F6] rounded-full overflow-hidden">
                <div className="w-[92%] h-full bg-[#A8F510] rounded-full" />
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                  <Sparkles size={12} className="text-[#A8F510]" fill="currentColor" />
                  Picked just for you
                </div>
                <button className="bg-[#A8F510] hover:bg-[#96E00B] text-[#0F1A05] text-[11px] font-bold px-4 py-2 rounded-lg transition-colors">
                  Apply Now
                </button>
              </div>
            </div>
          </div>

          {/* Stat Card */}
          <div className="absolute top-[160px] left-[260px] w-[200px] bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.08)] z-30 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F4FDE8] rounded-xl flex items-center justify-center text-[#4D7C0F]">
              <Briefcase size={20} />
            </div>
            <div>
              <p className="text-[16px] font-bold text-[#111827] leading-none mb-1">20 Jobs Found</p>
              <p className="text-[10px] text-[#6B7280] font-medium">Your next move is out there.</p>
            </div>
          </div>
        </div>

        {/* Benefit Rows */}
        <div className="space-y-5 pt-8">
          {[
            "Jobs that fit your skills and ambitions",
            "Tailored applications, sent automatically",
            "You stay in control. We do the legwork.",
          ].map((benefit, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 bg-[#EAF9D1] rounded-full flex items-center justify-center shrink-0">
                <Check size={14} className="text-[#4D7C0F]" strokeWidth={3} />
              </div>
              <span className="text-[14px] font-medium text-[#374151]">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Text */}
      <div className="mt-auto relative z-10">
        <p className="text-[12px] text-[#6B7280] opacity-60 font-medium">
          Built for your ambition. Designed to give you time back.
        </p>
      </div>
    </div>
  );
}
