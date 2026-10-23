"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User } from "lucide-react";
import { signUp, signInWithGoogle } from "@/features/auth/actions";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Divider } from "@/components/auth/Divider";
import { FormErrorBanner } from "@/components/auth/FormErrorBanner";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();
  
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

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await signUp(formData);
      if (result && !result.ok) {
        if (result.error?.includes("User already registered")) {
          setError("This email is already registered. Try signing in instead.");
        } else {
          setError(result.error ?? "Signup failed.");
        }
      } else {
        const email = formData.get("email") as string;
        router.push(`/check-email?email=${encodeURIComponent(email)}`);
      }
    });
  }

  function handleGoogle() {
    setError(null);
    startGoogleTransition(async () => {
      const result = await signInWithGoogle("/dashboard");
      if (result && !result.ok) setError(result.error ?? "Google sign-in failed.");
    });
  }

  return (
    <div className="w-full space-y-8">
      <div className="text-center lg:text-left space-y-2">
        <h1 className="text-[32px] font-semibold text-[#111827] tracking-tight leading-tight">
          Create your account
        </h1>
        <p className="text-[#6B7280] text-[15px] font-medium opacity-80">
          Make your next career move a little easier.
        </p>
      </div>

      <FormErrorBanner message={error} />

      <div className="space-y-6">
        <GoogleButton onClick={handleGoogle} isLoading={isGooglePending} />

        <Divider>or sign up with email</Divider>

        <form onSubmit={handleSubmit} className="space-y-6">
          <AuthInput
            label="Full name"
            name="full_name"
            type="text"
            placeholder="Alex Morgan"
            required
            icon={<User size={20} strokeWidth={1.5} />}
          />

          <AuthInput
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            icon={<Mail size={20} strokeWidth={1.5} />}
          />

          <div className="space-y-3">
            <AuthInput
              label="Password"
              name="password"
              type="password"
              placeholder="Create a password"
              required
              value={password}
              onChange={handlePasswordChange}
              icon={<Lock size={20} strokeWidth={1.5} />}
            />
            <PasswordStrengthMeter score={strength} hintText={strengthHint} />
          </div>

          <AuthInput
            label="Confirm password"
            name="confirm_password"
            type="password"
            placeholder="Re-enter your password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={<Lock size={20} strokeWidth={1.5} />}
          />

          <div className="flex items-start space-x-3 py-1">
            <Checkbox 
              id="terms" 
              name="terms" 
              required 
              className="mt-1 w-[18px] h-[18px] rounded-md border-[#D1D5DB] data-[state=checked]:bg-[#A8F510] data-[state=checked]:border-[#A8F510] data-[state=checked]:text-[#111827] ring-offset-white focus-visible:ring-2 focus-visible:ring-[#A8F510] transition-all" 
            />
            <label
              htmlFor="terms"
              className="text-[14px] font-medium text-[#6B7280] leading-relaxed cursor-pointer"
            >
              I agree to the <Link href="/terms" className="text-[#4D7C0F] font-bold hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-[#4D7C0F] font-bold hover:underline">Privacy Policy</Link>
            </label>
          </div>

          <div className="space-y-4">
            <AuthButton type="submit" isLoading={isPending} showArrow className="h-[52px] text-[15px]">
              Create account
            </AuthButton>
            
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F4FDE8] rounded-full text-[12px] font-bold text-[#4D7C0F] border border-[#D9F2A6]">
                <span className="w-1.5 h-1.5 bg-[#A8F510] rounded-full" />
                Free plan: 10 daily applies
              </div>
            </div>
          </div>
        </form>

        <div className="text-center">
          <p className="text-[14px] text-[#6B7280] font-medium">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#4D7C0F] font-bold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
