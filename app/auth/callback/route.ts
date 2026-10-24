import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * OAuth callback handler.
 * Supabase redirects here after Google sign-in with a ?code= param.
 * We exchange the code for a session and redirect to dashboard.
 */
export async function GET(request: Request) {
  const t0 = performance.now();
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const tClient = performance.now();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    const tExchange = performance.now();
    console.log(
      `[callback] createClient=${Math.round(tClient - t0)}ms ` +
        `exchangeCodeForSession=${Math.round(tExchange - tClient)}ms ` +
        `total=${Math.round(tExchange - t0)}ms`
    );
    if (!error) {
      // Redirect immediately — profile rows are provisioned by the
      // `on_auth_user_created` DB trigger, so there is nothing to write here.
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — send to login with error hint
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
