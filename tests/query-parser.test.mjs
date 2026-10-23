import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseJobQuery,
  matchesTitle,
  matchesLocation,
  filterJobsWithFallback,
} from "../lib/jobs/query-parser.ts";

describe("Query Parser & Search Matching Tests", () => {
  it("parses 'ML Engineer in Dubai jobs' correctly", () => {
    const res = parseJobQuery("ML Engineer in Dubai jobs");
    assert.equal(res.title, "ML Engineer");
    assert.equal(res.location, "Dubai");
    assert.equal(res.hasExplicitLocation, true);
  });

  it("parses 'Dubai ML Engineer' correctly", () => {
    const res = parseJobQuery("Dubai ML Engineer");
    assert.equal(res.title, "ML Engineer");
    assert.equal(res.location, "Dubai");
    assert.equal(res.hasExplicitLocation, true);
  });

  it("parses 'ML Engineer Dubai jobs' correctly", () => {
    const res = parseJobQuery("ML Engineer Dubai jobs");
    assert.equal(res.title, "ML Engineer");
    assert.equal(res.location, "Dubai");
    assert.equal(res.hasExplicitLocation, true);
  });

  it("parses title-only query 'Senior React Developer'", () => {
    const res = parseJobQuery("Senior React Developer");
    assert.equal(res.title, "Senior React Developer");
    assert.equal(res.location, "");
    assert.equal(res.hasExplicitLocation, false);
  });

  it("matches title synonyms (ML Engineer ~ Machine Learning Engineer ~ AI/ML)", () => {
    assert.equal(matchesTitle("Machine Learning Engineer", "ML Engineer"), true);
    assert.equal(matchesTitle("Senior ML Engineer", "Machine Learning Engineer"), true);
    assert.equal(matchesTitle("AI/ML Engineer - Albi", "ML Engineer"), true);
    assert.equal(matchesTitle("Staff Backend Engineer", "ML Engineer"), false);
  });

  it("matches location aliases (Dubai ~ UAE, and includes Remote)", () => {
    assert.equal(matchesLocation("Dubai, UAE", "Dubai"), true);
    assert.equal(matchesLocation("United Arab Emirates", "Dubai"), true);
    assert.equal(matchesLocation("Remote", "Dubai"), true);
    assert.equal(matchesLocation("London, UK", "Dubai"), false);
  });

  it("falls back to title matches when exact location yields 0 results", () => {
    const jobs = [
      {
        id: "1",
        user_id: "u1",
        platform: "greenhouse",
        title: "Machine Learning Engineer",
        company: "Alpha",
        location: "San Francisco, CA",
        salary: "$120k",
        job_type: "Full-time",
        experience_level: "mid",
        description: "ML role",
        tags: ["Python"],
        match_score: 85,
        job_url: "https://example.com/1",
        source_url: "https://example.com/1",
        applied_status: "not_applied",
        saved_status: false,
        fetched_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];

    const result = filterJobsWithFallback(jobs, "ML Engineer in Tokyo jobs");
    assert.equal(result.isFallback, true);
    assert.equal(result.matchedJobs.length, 1);
    assert.ok(result.fallbackMessage?.includes("Tokyo"));
  });
});
