"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface GoogleButtonProps {
  /** Path to land on after a successful OAuth round trip. */
  next?: string;
  /** Called with a friendly message if the OAuth request fails. */
  onError?: (message: string) => void;
  text?: string;
}

/**
 * Official Google "G" mark as a single clean inline SVG.
 * 4 paths with the official brand colors and a matching 48x48 viewBox so the
 * whole glyph stays inside the viewport (no clipping) at any size/zoom.
 */
function GoogleIcon() {
  return (
    <svg
      className="block h-[18px] w-[18px] shrink-0"
      viewBox="0 0 48 48"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function GoogleButton({
  next = "/dashboard",
  onError,
  text = "Continue with Google",
}: GoogleButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    // Guard against double clicks — the button is also disabled while loading.
    if (isLoading) return;
    setIsLoading(true);
    onError?.("");
    const startedAt = performance.now();

    // Singleton browser client (created once, reused on every click).
    const supabase = createClient();
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "";

    console.time("[oauth] signInWithOAuth");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    console.timeEnd("[oauth] signInWithOAuth");
    console.log(
      `[oauth] url returned in ${Math.round(performance.now() - startedAt)}ms`
    );

    if (error) {
      // Reset so the user can retry after a failure.
      setIsLoading(false);
      onError?.(error.message);
    }
    // On success supabase-js redirects the browser to Google automatically.
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-busy={isLoading}
      className="w-full flex items-center justify-center gap-3 h-[52px] px-6 bg-white border border-[#E5E7EB] rounded-[12px] text-[#111827] font-medium hover:bg-[#F9FAFB] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <Loader2 className="w-[18px] h-[18px] shrink-0 animate-spin text-[#9CA3AF]" />
      ) : (
        <GoogleIcon />
      )}
      <span className="text-[14px]">
        {isLoading ? "Connecting to Google..." : text}
      </span>
    </button>
  );
}
