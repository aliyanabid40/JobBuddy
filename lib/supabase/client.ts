import { createBrowserClient } from "@supabase/ssr";

type BrowserClient = ReturnType<typeof createBrowserClient>;

// Singleton — the browser client is created once per tab and reused.
// Creating it on every click/render is wasteful and adds avoidable work
// right before the OAuth redirect.
let browserClient: BrowserClient | undefined;

export function createClient(): BrowserClient {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}
