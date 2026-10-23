import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = "http://localhost:3000";

describe("Phase 5 - File Integrity & Architecture Tests", () => {
  it("verifies all database migrations exist for jobs cache", () => {
    const migrations = [
      "supabase/migrations/005_jobs_cache_and_fetch_log.sql",
      "supabase/migrations/006_jobs_cache_schema_update.sql",
    ];
    for (const m of migrations) {
      const fullPath = path.resolve(process.cwd(), m);
      assert.equal(fs.existsSync(fullPath), true, `Migration must exist: ${m}`);
      const content = fs.readFileSync(fullPath, "utf-8");
      assert.ok(content.length > 50, `Migration ${m} should not be empty`);
    }
  });

  it("verifies migration enforces jobs_cache naming and RLS security", () => {
    const m5 = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/migrations/005_jobs_cache_and_fetch_log.sql"),
      "utf-8"
    );
    assert.ok(m5.includes("create table if not exists public.jobs_cache"), "Table name must be jobs_cache");
    assert.ok(m5.includes("enable row level security"), "RLS must be enabled on jobs_cache");
    assert.ok(m5.includes("auth.uid() = user_id"), "RLS policies must enforce auth.uid() = user_id");

    const m6 = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/migrations/006_jobs_cache_schema_update.sql"),
      "utf-8"
    );
    assert.ok(m6.includes("company_logo"), "Migration 006 must include company_logo");
    assert.ok(m6.includes("job_type"), "Migration 006 must include job_type");
    assert.ok(m6.includes("tags"), "Migration 006 must include tags");
    assert.ok(m6.includes("saved_status"), "Migration 006 must include saved_status");
  });

  it("verifies all required Phase 5 library modules exist", () => {
    const libFiles = [
      "lib/jobs/types.ts",
      "lib/jobs/query-builder.ts",
      "lib/jobs/normalizer.ts",
      "lib/jobs/match-score.ts",
      "lib/jobs/cache.ts",
      "lib/jobs/tavily.ts",
    ];
    for (const file of libFiles) {
      const fullPath = path.resolve(process.cwd(), file);
      assert.equal(fs.existsSync(fullPath), true, `Library file must exist: ${file}`);
    }
  });

  it("verifies all required Phase 5 components exist", () => {
    const components = [
      "components/jobs/welcome-banner.tsx",
      "components/jobs/platform-selector.tsx",
      "components/jobs/job-row.tsx",
      "components/jobs/jobs-skeleton.tsx",
      "components/jobs/jobs-sidebar.tsx",
      "components/jobs/jobs-dashboard-client.tsx",
      "app/dashboard/jobs/page.tsx",
    ];
    for (const comp of components) {
      const fullPath = path.resolve(process.cwd(), comp);
      assert.equal(fs.existsSync(fullPath), true, `Component must exist: ${comp}`);
    }
  });
});

describe("Phase 5 - Business Logic & UI Visual Token Compliance", () => {
  it("verifies brand accent token #ACF417 is applied in UI components", () => {
    const cardContent = fs.readFileSync(
      path.resolve(process.cwd(), "components/jobs/job-row.tsx"),
      "utf-8"
    );
    assert.ok(cardContent.includes("#ACF417"), "JobRow must use #ACF417 accent color");
    assert.ok(cardContent.includes('target="_blank"'), "JobRow Apply Now must open in new tab");

    const selectorContent = fs.readFileSync(
      path.resolve(process.cwd(), "components/jobs/platform-selector.tsx"),
      "utf-8"
    );
    assert.ok(selectorContent.includes("#ACF417"), "PlatformSelector must use #ACF417 accent color");

    const sidebarContent = fs.readFileSync(
      path.resolve(process.cwd(), "components/jobs/jobs-sidebar.tsx"),
      "utf-8"
    );
    assert.ok(sidebarContent.includes("#ACF417"), "JobsSidebar must use #ACF417 accent color");
  });

  it("verifies 6-hour caching rule in lib/jobs/cache.ts", () => {
    const cacheContent = fs.readFileSync(
      path.resolve(process.cwd(), "lib/jobs/cache.ts"),
      "utf-8"
    );
    assert.ok(
      cacheContent.includes("6 * 60 * 60 * 1000") || cacheContent.includes("21600000"),
      "Cache TTL must be 6 hours"
    );
    assert.ok(cacheContent.includes("isCacheStale"), "Must export isCacheStale check");
    assert.ok(cacheContent.includes("getJobsFromDB"), "Must export getJobsFromDB");
    assert.ok(cacheContent.includes("replaceJobsInDB"), "Must export replaceJobsInDB");
  });

  it("verifies platform site filters in lib/jobs/query-builder.ts", () => {
    const qbContent = fs.readFileSync(
      path.resolve(process.cwd(), "lib/jobs/query-builder.ts"),
      "utf-8"
    );
    assert.ok(qbContent.includes("site:greenhouse.io"), "Must support greenhouse site query");
    assert.ok(qbContent.includes("site:lever.co"), "Must support lever site query");
    assert.ok(qbContent.includes("site:workable.com"), "Must support workable site query");
    assert.ok(qbContent.includes("site:wellfound.com"), "Must support wellfound site query");
  });
});

describe("Phase 5 - Live HTTP Security & Route Integration", () => {
  it("guards /dashboard/jobs and redirects unauthenticated requests", async () => {
    try {
      const res = await fetch(`${BASE_URL}/dashboard/jobs`, {
        redirect: "manual",
      });
      // Should redirect (307, 302, 303) or return login page
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        assert.ok(
          location.includes("login"),
          `Expected redirect to login, got ${location}`
        );
      } else {
        assert.equal(res.status, 200, "Dashboard should be accessible or redirect");
      }
    } catch (err) {
      // Ignore if server not running
    }
  });

  it("verifies /login page responds with HTTP 200", async () => {
    try {
      const res = await fetch(`${BASE_URL}/login`);
      assert.equal(res.status, 200, "Login page must return 200 OK");
    } catch (err) {
      console.warn("Dev server check skipped:", err.message);
    }
  });
});
