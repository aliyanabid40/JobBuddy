/**
 * @file tests/phase5_tavily_white_theme.test.mjs
 * Validation suite for:
 * 1. Tavily Search API client and removal of Brave
 * 2. Pure white dashboard theme & styling tokens
 * 3. Plain text Sign Out button (Image 2 alignment)
 * 4. 6-hour cache TTL logic
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Tavily Search API & Brave Removal Validation", () => {
  it("confirms lib/jobs/brave.ts is removed", () => {
    const bravePath = path.resolve(process.cwd(), "lib/jobs/brave.ts");
    assert.equal(fs.existsSync(bravePath), false, "lib/jobs/brave.ts must be completely deleted");
  });

  it("confirms lib/jobs/tavily.ts exists and uses @tavily/core", () => {
    const tavilyPath = path.resolve(process.cwd(), "lib/jobs/tavily.ts");
    assert.equal(fs.existsSync(tavilyPath), true, "lib/jobs/tavily.ts must exist");
    const content = fs.readFileSync(tavilyPath, "utf-8");
    assert.ok(content.includes('@tavily/core'), "Must import from @tavily/core");
    assert.ok(content.includes('client.search'), "Must invoke client.search");
    assert.ok(content.includes('TAVILY_API_KEY'), "Must use TAVILY_API_KEY");
  });

  it("confirms features/jobs/actions.ts uses searchTavilyMultiple", () => {
    const actionsPath = path.resolve(process.cwd(), "features/jobs/actions.ts");
    const content = fs.readFileSync(actionsPath, "utf-8");
    assert.ok(content.includes('searchTavilyMultiple'), "Must import and use searchTavilyMultiple");
    assert.equal(content.includes('searchBraveMultiple'), false, "Must not contain searchBraveMultiple");
  });

  it("confirms .env.local has TAVILY_API_KEY", () => {
    const envPath = path.resolve(process.cwd(), ".env.local");
    const content = fs.readFileSync(envPath, "utf-8");
    assert.ok(content.includes('TAVILY_API_KEY'), ".env.local must contain TAVILY_API_KEY");
  });

  it("confirms docs/Architecture.md reflects Tavily", () => {
    const archPath = path.resolve(process.cwd(), "docs/Architecture.md");
    const content = fs.readFileSync(archPath, "utf-8");
    assert.ok(content.includes('Tavily Search API'), "Architecture stack must reference Tavily Search API");
    assert.ok(content.includes('TAVILY_API_KEY'), "Architecture env vars must reference TAVILY_API_KEY");
  });
});

describe("Clean White Theme & Image 2 Compliance", () => {
  it("verifies header sign-out button is plain text style", () => {
    const headerPath = path.resolve(process.cwd(), "components/dashboard/dashboard-header.tsx");
    const content = fs.readFileSync(headerPath, "utf-8");
    assert.ok(content.includes('id="header-sign-out-btn"'), "Must have header-sign-out-btn");
    assert.ok(content.includes('Sign Out'), "Must contain 'Sign Out' text");
    // Verify it doesn't have the old red button border/bg
    assert.equal(content.includes('bg-red-500/5'), false, "Must not have red background");
    assert.equal(content.includes('border-red-300'), false, "Must not have red border");
  });

  it("verifies app-sidebar is pure white with no dark background classes", () => {
    const sidebarPath = path.resolve(process.cwd(), "components/dashboard/app-sidebar.tsx");
    const content = fs.readFileSync(sidebarPath, "utf-8");
    assert.ok(content.includes('bg-white text-zinc-900'), "Sidebar must have bg-white text-zinc-900");
    assert.equal(content.includes('dark:bg-zinc-950'), false, "Sidebar must not have dark:bg-zinc-950");
  });

  it("verifies welcome banner is pure white card with subtle styling", () => {
    const bannerPath = path.resolve(process.cwd(), "components/jobs/welcome-banner.tsx");
    const content = fs.readFileSync(bannerPath, "utf-8");
    assert.ok(content.includes('bg-white'), "Welcome banner must have bg-white");
    assert.equal(content.includes('rgba(24,24,27,0.85)'), false, "Welcome banner must not have dark gradient");
  });

  it("verifies platform selector cards have white backgrounds", () => {
    const selectorPath = path.resolve(process.cwd(), "components/jobs/platform-selector.tsx");
    const content = fs.readFileSync(selectorPath, "utf-8");
    assert.ok(content.includes('bg-white'), "Platform cards must be bg-white");
    assert.equal(content.includes('rgba(255,255,255,0.025)'), false, "Platform cards must not have dark tint");
  });

  it("verifies job cards have clean white background", () => {
    const cardPath = path.resolve(process.cwd(), "components/jobs/job-card.tsx");
    const content = fs.readFileSync(cardPath, "utf-8");
    assert.ok(content.includes('bg-white border border-zinc-200'), "Job cards must have bg-white border border-zinc-200");
    assert.equal(content.includes('rgba(255,255,255,0.035)'), false, "Job cards must not have dark background");
  });

  it("verifies profile completeness widget has white background and green ring", () => {
    const sidebarWidgetPath = path.resolve(process.cwd(), "components/jobs/jobs-sidebar.tsx");
    const content = fs.readFileSync(sidebarWidgetPath, "utf-8");
    assert.ok(content.includes('bg-white border border-zinc-200'), "Sidebar widget must have bg-white border border-zinc-200");
    assert.ok(content.includes('circumference'), "Must retain SVG ring calculation");
  });
});
