import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // OAuth / email plumbing endpoints (e.g. /auth/callback) read the session
  // themselves. Running a redundant `getUser()` here would add a full round
  // trip to Supabase on the critical login path, so skip them entirely.
  if (pathname.startsWith("/auth/")) {
    return NextResponse.next({ request });
  }

  // Protected routes: /dashboard, /jobs, /resume, /profile, /application-status, /billing
  const protectedRoutes = ["/dashboard", "/jobs", "/resume", "/profile", "/application-status", "/billing"];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Auth pages that should bounce an already-signed-in user to the dashboard.
  const authPages = ["/login", "/signup", "/forgot-password", "/check-email"];
  const isAuthPage = authPages.includes(pathname);

  // Public routes (marketing, docs, etc.) need neither a session nor a refresh.
  // Returning early avoids a Supabase round trip on every page view.
  if (!isProtectedRoute && !isAuthPage) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Single session refresh + user lookup per request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthPage && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image  (image optimisation)
     * - favicon.ico  (browser icon)
     * - public assets (svg, png, jpg …)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
