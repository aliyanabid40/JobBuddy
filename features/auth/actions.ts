"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AuthResult {
  ok: boolean;
  error?: string;
}

// ── Sign Up ────────────────────────────────────────────────────────────────

export async function signUp(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!fullName || !email || !password) {
    return { ok: false, error: "All fields are required." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { 
        full_name: fullName,
        email: email // stored in metadata for trigger fallback
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
    },
  });

  if (error) return { ok: false, error: error.message };

  // Note: Client handles redirect to /check-email after success
  return { ok: true };
}

// ── Sign In ────────────────────────────────────────────────────────────────

export async function signIn(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");
  const remember = formData.get("remember") === "on";

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { ok: false, error: error.message };

  // Note on "Remember me": 
  // Supabase Auth with @supabase/ssr handles session persistence via cookies.
  // By default, sessions are persistent. If "Remember me" is unchecked, 
  // we could theoretically set the cookie to expire on browser close, 
  // but for simplicity in this SSR setup, we follow the default persistence.
  
  revalidatePath("/", "layout");
  redirect(next);
}

// ── Google OAuth ───────────────────────────────────────────────────────────

export async function signInWithGoogle(next: string = "/dashboard"): Promise<AuthResult> {
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) return { ok: false, error: error.message };
  if (data.url) redirect(data.url);

  return { ok: true };
}

// ── Sign Out ───────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
