/**
 * @file __tests__/job-query-builder.test.ts
 * White-box unit tests for lib/jobs/query-builder.ts
 */

import {
  buildPlatformQuery,
  buildAllPlatformQueries,
  PLATFORM_SITE_FILTERS,
  ALL_PLATFORMS,
} from "@/lib/jobs/query-builder";
import type { UserProfileForJobs } from "@/lib/jobs/types";

const SAMPLE_PROFILE: UserProfileForJobs = {
  title: "Software Engineer",
  skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Docker"],
  location: "London, UK",
  summary: "Experienced full stack engineer.",
};

describe("buildPlatformQuery", () => {
  it("includes quoted job title in query", () => {
    const q = buildPlatformQuery(SAMPLE_PROFILE, "greenhouse");
    expect(q).toContain('"Software Engineer"');
  });

  it("includes top 3 skills only", () => {
    const q = buildPlatformQuery(SAMPLE_PROFILE, "lever");
    expect(q).toContain("TypeScript");
    expect(q).toContain("React");
    expect(q).toContain("Node.js");
    // 4th and 5th skill should NOT be in query
    expect(q).not.toContain("PostgreSQL");
    expect(q).not.toContain("Docker");
  });

  it("includes only first city segment from location", () => {
    const q = buildPlatformQuery(SAMPLE_PROFILE, "workable");
    expect(q).toContain("London");
    expect(q).not.toContain(", UK"); // full location not included
  });

  it("appends the correct site: filter for each platform", () => {
    for (const platform of ALL_PLATFORMS) {
      const q = buildPlatformQuery(SAMPLE_PROFILE, platform);
      expect(q).toContain(PLATFORM_SITE_FILTERS[platform]);
    }
  });

  it("falls back to 'Software Engineer' when title is missing", () => {
    const profileNoTitle: UserProfileForJobs = {
      ...SAMPLE_PROFILE,
      title: "",
    };
    const q = buildPlatformQuery(profileNoTitle, "greenhouse");
    expect(q).toContain("Software Engineer");
  });

  it("omits location segment when location is empty", () => {
    const profileNoLocation: UserProfileForJobs = {
      ...SAMPLE_PROFILE,
      location: "",
    };
    const q = buildPlatformQuery(profileNoLocation, "lever");
    // Should not contain any lone location token
    expect(q).not.toMatch(/London|UK/);
  });

  it("produces a non-empty query even with a minimal profile", () => {
    const minimal: UserProfileForJobs = {
      title: "",
      skills: [],
      location: "",
      summary: "",
    };
    const q = buildPlatformQuery(minimal, "wellfound");
    expect(q.trim().length).toBeGreaterThan(0);
  });
});

describe("buildAllPlatformQueries", () => {
  it("returns a query for every platform", () => {
    const queries = buildAllPlatformQueries(SAMPLE_PROFILE);
    for (const platform of ALL_PLATFORMS) {
      expect(queries[platform]).toBeDefined();
      expect(queries[platform].length).toBeGreaterThan(10);
    }
  });

  it("each query contains the correct platform site filter", () => {
    const queries = buildAllPlatformQueries(SAMPLE_PROFILE);
    for (const platform of ALL_PLATFORMS) {
      expect(queries[platform]).toContain(PLATFORM_SITE_FILTERS[platform]);
    }
  });

  it("different platforms produce different query strings", () => {
    const queries = buildAllPlatformQueries(SAMPLE_PROFILE);
    const values = Object.values(queries);
    const unique = new Set(values);
    expect(unique.size).toBe(ALL_PLATFORMS.length);
  });
});
