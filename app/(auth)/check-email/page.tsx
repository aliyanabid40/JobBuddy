"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckEmailCard } from "@/components/auth/CheckEmailCard";
import { createClient } from "@/lib/supabase/client";

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");
  const [resendCooldown, setResendCooldown] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    if (!email) {
      router.push("/signup");
    }
  }, [email, router]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleOpenApp = () => {
    if (!email) return;
    const domain = email.split("@")[1]?.toLowerCase();
    
    let url = "mailto:";
    if (domain === "gmail.com") url = "https://mail.google.com";
    else if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com") url = "https://outlook.live.com";
    else if (domain === "yahoo.com") url = "https://mail.yahoo.com";
    
    window.open(url, "_blank");
  };

  const handleResend = async () => {
    if (!email || resendCooldown > 0) return;
    
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (!error) {
      setResendCooldown(60);
    }
  };

  if (!email) return null;

  return (
    <div className="w-full flex justify-center py-8">
      <CheckEmailCard
        email={email}
        onOpenApp={handleOpenApp}
        onResend={handleResend}
        resendCooldown={resendCooldown}
      />
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<div className="h-96 flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#A8F510] border-t-transparent rounded-full animate-spin" /></div>}>
      <CheckEmailContent />
    </Suspense>
  );
}
