"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { FormErrorBanner } from "@/components/auth/FormErrorBanner";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email"));

    startTransition(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    });
  }

  if (success) {
    return (
      <div className="w-full space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Check your inbox</h1>
          <p className="text-muted-foreground font-medium leading-relaxed">
            We&apos;ve sent a password reset link to your email address.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-bold text-accent-text hover:underline"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground leading-tight">Forgot password?</h1>
        <p className="text-muted-foreground font-medium leading-relaxed">
          No worries, it happens. Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <FormErrorBanner message={error} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <AuthInput
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoFocus
          icon={<Mail size={20} />}
        />

        <AuthButton type="submit" isLoading={isPending}>
          Send reset link
        </AuthButton>
      </form>

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
