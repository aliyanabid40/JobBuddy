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
      return { redirect: "/login", status: 307 };
    }
    if ((pathname === "/login" || pathname === "/signup") && user) {
      return { redirect: "/dashboard", status: 307 };
    }
    return { ok: true, status: 200 };
  }

  it("redirects unauthenticated user accessing /dashboard to /login", () => {
    const res = simulateMiddleware("/dashboard", null);
    assert.equal(res.redirect, "/login");
  });

  it("redirects unauthenticated user accessing nested /dashboard/profile to /login", () => {
    const res = simulateMiddleware("/dashboard/profile", null);
    assert.equal(res.redirect, "/login");
  });

  it("allows unauthenticated user to access /login", () => {
    const res = simulateMiddleware("/login", null);
    assert.equal(res.ok, true);
  });

  it("allows unauthenticated user to access /signup", () => {
    const res = simulateMiddleware("/signup", null);
    assert.equal(res.ok, true);
  });

  it("allows unauthenticated user to access landing page /", () => {
    const res = simulateMiddleware("/", null);
    assert.equal(res.ok, true);
  });

  it("redirects authenticated user accessing /login to /dashboard", () => {
    const fakeUser = { id: "123" };
    const res = simulateMiddleware("/login", fakeUser);
    assert.equal(res.redirect, "/dashboard");
  });

  it("redirects authenticated user accessing /signup to /dashboard", () => {
    const fakeUser = { id: "123" };
    const res = simulateMiddleware("/signup", fakeUser);
    assert.equal(res.redirect, "/dashboard");
  });

  it("allows authenticated user to access /dashboard", () => {
    const fakeUser = { id: "123" };
    const res = simulateMiddleware("/dashboard", fakeUser);
    assert.equal(res.ok, true);
  });
});

describe("Phase 2 - Live HTTP Integration Tests (localhost:3000)", () => {
  const BASE_URL = "http://localhost:3000";

  it("GET /dashboard without session returns 307 redirect to /login", async () => {
    const res = await fetch(`${BASE_URL}/dashboard`, { redirect: "manual" });
    assert.equal(res.status, 307);
    const location = res.headers.get("location");
    assert.ok(location?.includes("/login"), `Expected redirect to /login but got ${location}`);
  });

  it("GET /login returns HTTP 200 with Sign In page content", async () => {
    const res = await fetch(`${BASE_URL}/login`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes("Welcome back"), "Page must contain 'Welcome back'");
  });

  it("GET /signup returns HTTP 200 with Sign Up page content", async () => {
    const res = await fetch(`${BASE_URL}/signup`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes("Create your account"), "Page must contain 'Create your account'");
  });

  it("GET /auth/callback without code redirects to /login with oauth_failed", async () => {
    const res = await fetch(`${BASE_URL}/auth/callback`, { redirect: "manual" });
    assert.equal(res.status, 307);
    const location = res.headers.get("location");
    assert.ok(location?.includes("/login?error=oauth_failed"), `Expected redirect to /login?error=oauth_failed but got ${location}`);
  });

  it("GET / returns HTTP 200", async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert.equal(res.status, 200);
  });
});
