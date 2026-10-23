/**
 * @file __tests__/match-score.test.ts
 * White-box unit tests for lib/jobs/match-score.ts
 */

import { calculateMatchScore, SCORE_WEIGHTS } from "@/lib/jobs/match-score";
import type { UserProfileForJobs } from "@/lib/jobs/types";

const BASE_PROFILE: UserProfileForJobs = {
  title: "Software Engineer",
  skills: ["TypeScript", "React", "Node.js"],
  location: "London",
  summary: "",
};

const BASE_JOB = {
  title: "Software Engineer",
  description: "Looking for a TypeScript React Node.js developer. London office.",
  location: "London",
};

describe("calculateMatchScore", () => {
  it("returns a perfect-ish score for a fully matching job", () => {
    const score = calculateMatchScore(BASE_JOB, BASE_PROFILE);
    // Title: 40 + Skills: 3*8=24 + Location: 20 = 84
    expect(score).toBeGreaterThanOrEqual(80);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("awards title match points when title appears in job text", () => {
    const job = { title: "Software Engineer", description: "", location: "" };
    const score = calculateMatchScore(job, BASE_PROFILE);
    expect(score).toBeGreaterThanOrEqual(SCORE_WEIGHTS.TITLE);
  });

  it("returns 0 for a completely unrelated job", () => {
    const unrelated = {
      title: "Chef de Cuisine",
      description: "Experienced sous chef for Michelin star restaurant.",
      location: "Paris",
    };
    const score = calculateMatchScore(unrelated, BASE_PROFILE);
    expect(score).toBe(0);
  });

  it("caps skills contribution at MAX_SKILL_MATCHES * SKILL_PER_MATCH", () => {
    const profile: UserProfileForJobs = {
      ...BASE_PROFILE,
      skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Docker", "AWS", "Kubernetes"],
    };
    const job = {
      title: "",
      description: "TypeScript React Node.js PostgreSQL Docker AWS Kubernetes engineer",
      location: "",
    };
    const score = calculateMatchScore(job, profile);
    const maxSkillScore = SCORE_WEIGHTS.MAX_SKILL_MATCHES * SCORE_WEIGHTS.SKILL_PER_MATCH;
    expect(score).toBeLessThanOrEqual(maxSkillScore);
  });

  it("awards location points when job location contains user city", () => {
    const job = {
      title: "",
      description: "London based opportunity",
      location: "London, UK",
    };
    const score = calculateMatchScore(job, BASE_PROFILE);
    expect(score).toBeGreaterThanOrEqual(SCORE_WEIGHTS.LOCATION);
  });

  it("does not exceed 100 even with all signals matching", () => {
    const score = calculateMatchScore(BASE_JOB, BASE_PROFILE);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("handles missing description gracefully (no throw)", () => {
    const job = { title: "Software Engineer", description: "", location: "" };
    expect(() => calculateMatchScore(job, BASE_PROFILE)).not.toThrow();
  });

  it("handles empty profile skills array (no throw, zero skill score)", () => {
    const noSkillsProfile: UserProfileForJobs = { ...BASE_PROFILE, skills: [] };
    const score = calculateMatchScore(BASE_JOB, noSkillsProfile);
    // Title + location only (max 60)
    expect(score).toBeLessThanOrEqual(60);
  });

  it("is case-insensitive for skill matching", () => {
    const job = {
      title: "",
      description: "We use TYPESCRIPT and REACT daily.",
      location: "",
    };
    const score = calculateMatchScore(job, BASE_PROFILE);
    expect(score).toBeGreaterThan(0);
  });

  it("awards partial title match when individual words match", () => {
    const job = {
      title: "Senior Engineer",
      description: "Backend engineer role at scale",
      location: "",
    };
    // "Engineer" is in "Software Engineer" — partial match
    const score = calculateMatchScore(job, BASE_PROFILE);
    expect(score).toBeGreaterThan(0);
  });
});
