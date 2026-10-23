"use client";

import React, { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { signIn, signInWithGoogle } from "@/features/auth/actions";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Divider } from "@/components/auth/Divider";
import { FormErrorBanner } from "@/components/auth/FormErrorBanner";
import { Checkbox } from "@/components/ui/checkbox";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const oauthError = searchParams.get("error") === "oauth_failed";

  const [error, setError] = useState<string | null>(
    oauthError ? "Google sign-in failed. Please try again." : null
  );
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.append("next", next);

    startTransition(async () => {
      const result = await signIn(formData);
      if (result && !result.ok) {
        if (result.error?.includes("Invalid login credentials")) {
          setError("We couldn't sign you in. Your email or password doesn't look right. Check your details and try again.");
        } else {
          setError(result.error ?? "Sign-in failed.");
        }
      }
    });
  }

  function handleGoogle() {
    setError(null);
    startGoogleTransition(async () => {
      const result = await signInWithGoogle(next);
      if (result && !result.ok) setError(result.error ?? "Google sign-in failed.");
    });
  }

  return (
    <div className="w-full space-y-8">
      {/* Title block */}
      <div className="space-y-2">
        <h1 className="text-[32px] font-semibold text-[#111827] tracking-tight">
          Welcome back
        </h1>
        <p className="text-[#6B7280] text-[15px] font-medium opacity-80">
          Your next opportunity is waiting. Let's get to it.
        </p>
      </div>

      <FormErrorBanner message={error} />

      <div className="space-y-6">
        <GoogleButton onClick={handleGoogle} isLoading={isGooglePending} />

        <Divider>or continue with email</Divider>

        <form onSubmit={handleSubmit} className="space-y-6">
          <AuthInput
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            required
            icon={<Mail size={20} strokeWidth={1.5} />}
          />

          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[14px] font-semibold text-[#111827]">Password</label>
              <Link
                href="/forgot-password"
                className="text-[13px] font-bold text-[#4D7C0F] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <AuthInput
              label=""
              name="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              icon={<Lock size={20} strokeWidth={1.5} />}
            />
          </div>

          <div className="flex items-center space-x-3 py-1">
            <Checkbox 
              id="remember" 
              name="remember" 
            />
            <label
              htmlFor="remember"
              className="text-[13px] font-medium text-[#6B7280] cursor-pointer"
            >
              Remember me for 30 days
            </label>
          </div>

          <AuthButton type="submit" isLoading={isPending} showArrow className="h-[52px] text-[15px]">
            Sign in
          </AuthButton>
        </form>

        <div className="space-y-6">
          <p className="text-[14px] text-[#6B7280] font-medium">
            New to JobBuddy?{" "}
            <Link
              href="/signup"
              className="text-[#4D7C0F] font-bold hover:underline"
            >
              Create account
            </Link>
          </p>
          
          <div className="space-y-4">
            <p className="text-[12px] text-[#6B7280] opacity-80">
              Your job search, always private and secure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-96 flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#A8F510] border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
