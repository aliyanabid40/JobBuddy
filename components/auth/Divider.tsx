import React from "react";

interface DividerProps {
  children: React.ReactNode;
}

export function Divider({ children }: DividerProps) {
  return (
    <div className="relative w-full py-2">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-[#E5E7EB]" />
      </div>
      <div className="relative flex justify-center text-[12px]">
        <span className="bg-[#F7F7F8] px-4 text-[#9CA3AF] font-medium">
          {children}
        </span>
      </div>
    </div>
  );
}
