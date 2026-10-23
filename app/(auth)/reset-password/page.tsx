"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { FormErrorBanner } from "@/components/auth/FormErrorBanner";
import { createClient } from "@/lib/supabase/client";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [strength, setStrength] = useState(0);
  const [strengthHint, setStrengthHint] = useState("Use 8+ characters with a number and a symbol");

  const calculateStrength = (pwd: string) => {
    let score = 0;
    if (!pwd) return 0;
    if (pwd.length >= 8) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    const score = calculateStrength(val);
    setStrength(score);
    if (score >= 4) {
      setStrengthHint("Strong password. You're good to go");
    } else {
      setStrengthHint("Use 8+ characters with a number and a symbol");
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
      } else {
        router.push("/dashboard?message=password_reset_success");
      }
    });
  }

  return (
    <div className="w-full space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground leading-tight">Reset password</h1>
        <p className="text-muted-foreground font-medium leading-relaxed">
          Choose a strong password to keep your account secure.
        </p>
      </div>

      <FormErrorBanner message={error} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <AuthInput
            label="New password"
            name="password"
            type="password"
            placeholder="Create a new password"
            required
            autoFocus
            value={password}
            onChange={handlePasswordChange}
            icon={<Lock size={20} />}
          />
          <PasswordStrengthMeter score={strength} hintText={strengthHint} />
        </div>

        <AuthInput
          label="Confirm new password"
          name="confirm_password"
          type="password"
          placeholder="Re-enter your new password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          icon={<Lock size={20} />}
        />

        <AuthButton type="submit" isLoading={isPending}>
          Update password
        </AuthButton>
      </form>
    </div>
  );
}
