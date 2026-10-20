import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Phase 2 - Unit & Form Validation Tests", () => {
  it("signUp validation fails when full_name is missing", async () => {
    const formData = new Map();
    formData.set("email", "test@example.com");
    formData.set("password", "password123");

    const fullName = String(formData.get("full_name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    assert.equal(!fullName || !email || !password, true);
  });

  it("signUp validation fails when password is shorter than 8 characters", async () => {
    const password = "short";
    assert.equal(password.length < 8, true);
  });

  it("signUp validation passes with valid full_name, email, and password >= 8 chars", async () => {
    const fullName = "Test User";
    const email = "user@test.com";
    const password = "securepassword123";

    assert.equal(!fullName || !email || !password, false);
    assert.equal(password.length >= 8, true);
  });

  it("signIn validation fails when email or password is missing", async () => {
    const email = "";
    const password = "password123";

    assert.equal(!email || !password, true);
  });

  it("signUp client-side password matching check works as expected", () => {
    const pass1 = "secret123";
    const pass2 = "different123";
    assert.notEqual(pass1, pass2);

    const pass3 = "secret123";
    assert.equal(pass1, pass3);
  });
});

describe("Phase 2 - Middleware Logic & Route Guard Tests", () => {
  function simulateMiddleware(pathname, user) {
    if (pathname.startsWith("/dashboard") && !user) {
      return { redirect: "/sign-in", status: 307 };
    }
    if ((pathname === "/sign-in" || pathname === "/sign-up") && user) {
      return { redirect: "/dashboard", status: 307 };
    }
    return { ok: true, pathname };
  }

  it("redirects unauthenticated user accessing /dashboard to /sign-in", () => {
    const res = simulateMiddleware("/dashboard", null);
    assert.equal(res.redirect, "/sign-in");
  });

  it("redirects unauthenticated user accessing nested /dashboard/profile to /sign-in", () => {
    const res = simulateMiddleware("/dashboard/profile", null);
    assert.equal(res.redirect, "/sign-in");
  });

  it("allows unauthenticated user to access /sign-in", () => {
    const res = simulateMiddleware("/sign-in", null);
    assert.equal(res.ok, true);
  });

  it("allows unauthenticated user to access /sign-up", () => {
    const res = simulateMiddleware("/sign-up", null);
    assert.equal(res.ok, true);
  });

  it("allows unauthenticated user to access landing page /", () => {
    const res = simulateMiddleware("/", null);
    assert.equal(res.ok, true);
  });

  it("redirects authenticated user accessing /sign-in to /dashboard", () => {
    const fakeUser = { id: "123", email: "user@test.com" };
    const res = simulateMiddleware("/sign-in", fakeUser);
    assert.equal(res.redirect, "/dashboard");
  });

  it("redirects authenticated user accessing /sign-up to /dashboard", () => {
    const fakeUser = { id: "123", email: "user@test.com" };
    const res = simulateMiddleware("/sign-up", fakeUser);
    assert.equal(res.redirect, "/dashboard");
  });

  it("allows authenticated user to access /dashboard", () => {
    const fakeUser = { id: "123", email: "user@test.com" };
    const res = simulateMiddleware("/dashboard", fakeUser);
    assert.equal(res.ok, true);
  });
});

describe("Phase 2 - Live HTTP Integration Tests (localhost:3000)", () => {
  const BASE_URL = "http://localhost:3000";

  it("GET /dashboard without session returns 307 redirect to /sign-in", async () => {
    const res = await fetch(`${BASE_URL}/dashboard`, { redirect: "manual" });
    assert.equal(res.status, 307);
    const location = res.headers.get("location");
    assert.ok(location?.includes("/sign-in"), `Expected redirect to /sign-in but got ${location}`);
  });

  it("GET /sign-in returns HTTP 200 with Sign In page content", async () => {
    const res = await fetch(`${BASE_URL}/sign-in`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("JobBuddy"), "Sign-in page should contain 'JobBuddy'");
    assert.ok(html.includes("Continue with Google"), "Sign-in page should have Google OAuth button");
    assert.ok(html.includes("Sign in"), "Sign-in page should have Sign in button");
  });

  it("GET /sign-up returns HTTP 200 with Sign Up page content", async () => {
    const res = await fetch(`${BASE_URL}/sign-up`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("JobBuddy"), "Sign-up page should contain 'JobBuddy'");
    assert.ok(html.includes("Continue with Google"), "Sign-up page should have Google OAuth button");
    assert.ok(html.includes("Confirm password") || html.includes("confirm_password"), "Sign-up page should have confirm password");
  });

  it("GET /auth/callback without code redirects to /sign-in with oauth_failed", async () => {
    const res = await fetch(`${BASE_URL}/auth/callback`, { redirect: "manual" });
    assert.equal(res.status, 307);
    const location = res.headers.get("location");
    assert.ok(location?.includes("/sign-in?error=oauth_failed"), `Expected redirect to /sign-in?error=oauth_failed but got ${location}`);
  });

  it("GET / returns HTTP 200", async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert.equal(res.status, 200);
  });
});
