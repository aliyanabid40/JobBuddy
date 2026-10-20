import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS.
 * NEVER import this in client components or expose to the browser.
 * Used only in Inngest functions and server-side admin operations.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
