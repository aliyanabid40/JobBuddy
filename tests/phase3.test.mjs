import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Phase 3 - Static Asset & File Integrity Tests", () => {
  it("verifies public/jobbuddy-logo.png exists and is a valid non-empty PNG file", () => {
    const logoPath = path.resolve(process.cwd(), "public/jobbuddy-logo.png");
    assert.equal(fs.existsSync(logoPath), true, "jobbuddy-logo.png must exist");

    const stat = fs.statSync(logoPath);
    assert.ok(stat.size > 1000, "jobbuddy-logo.png should not be empty");

    // Check PNG signature bytes (0x89 0x50 0x4E 0x47)
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(logoPath, "r");
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    assert.equal(buffer[0], 0x89);
    assert.equal(buffer[1], 0x50); // P
    assert.equal(buffer[2], 0x4e); // N
    assert.equal(buffer[3], 0x47); // G
  });

  it("verifies all required Phase 3 dashboard route directories exist", () => {
    const requiredRoutes = [
      "app/dashboard/page.tsx",
      "app/dashboard/jobs/page.tsx",
      "app/dashboard/resume/page.tsx",
      "app/dashboard/profile/page.tsx",
      "app/dashboard/applications/page.tsx",
      "app/dashboard/billing/page.tsx",
      "app/dashboard/settings/page.tsx",
    ];

    for (const route of requiredRoutes) {
      const fullPath = path.resolve(process.cwd(), route);
      assert.equal(fs.existsSync(fullPath), true, `Route file must exist: ${route}`);
    }
  });

  it("verifies all required Phase 3 dashboard components exist", () => {
    const requiredComponents = [
      "components/dashboard/app-sidebar.tsx",
      "components/dashboard/dashboard-header.tsx",
      "components/dashboard/credits-widget.tsx",
      "components/dashboard/nav-user.tsx",
      "components/dashboard/dashboard-placeholder.tsx",
      "components/dashboard/dashboard-theme-provider.tsx",
    ];

    for (const comp of requiredComponents) {
      const fullPath = path.resolve(process.cwd(), comp);
      assert.equal(fs.existsSync(fullPath), true, `Component file must exist: ${comp}`);
    }
  });
});

describe("Phase 3 - Live HTTP Integration Tests (localhost:3000)", () => {
  const BASE_URL = "http://localhost:3000";

  it("serves /jobbuddy-logo.png with HTTP 200 and image/png content type", async () => {
    const res = await fetch(`${BASE_URL}/jobbuddy-logo.png`);
    assert.equal(res.status, 200);
    const contentType = res.headers.get("content-type");
    assert.ok(contentType?.includes("image/png") || contentType?.includes("image/"), `Unexpected content-type: ${contentType}`);
  });

  const dashboardEndpoints = [
    "/dashboard",
    "/dashboard/jobs",
    "/dashboard/resume",
    "/dashboard/profile",
    "/dashboard/applications",
    "/dashboard/billing",
    "/dashboard/settings",
  ];

  for (const endpoint of dashboardEndpoints) {
    it(`guards ${endpoint} and redirects unauthenticated requests to /sign-in`, async () => {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        redirect: "manual",
      });

      // Next.js middleware / layout guard redirects unauthenticated traffic with 307
      assert.equal(res.status, 307, `Expected 307 redirect for ${endpoint}`);
      const location = res.headers.get("location");
      assert.ok(
        location?.includes("/sign-in"),
        `Expected redirect to /sign-in, got ${location}`
      );
    });
  }
});
