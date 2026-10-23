/**
 * @file tests/logo-and-cleaner.test.mjs
 * Whitebox unit tests for the company-logo pipeline (lib/logo/*) and the
 * data-cleaning helpers (lib/jobs/cleaner.ts).
 *
 * The logo module is pure/zero-dependency apart from node:crypto + node:zlib,
 * so the image introspection and validation rules can be exercised directly
 * without any network access.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";

import {
  hashBuffer,
  readImageInfo,
  analyzePng,
  buildDomainSlugs,
  extractLogoUrlsFromHtml,
  MIN_LOGO_DIMENSION,
} from "../lib/logo/resolveLogo.ts";
import {
  hashCompanyName,
  getAvatarLetter,
  getLetterAvatarStyles,
} from "../lib/logo/letter-avatar.ts";
import {
  sanitizeText,
  isKnownSkillToken,
  looksLikeSkillList,
  cleanJobTitle,
  cleanLocation,
  cleanSalary,
  cleanSkillTags,
} from "../lib/jobs/cleaner.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Tiny PNG encoder so flat / transparent detection can be tested for real.
// ─────────────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

/** Build an 8-bit RGBA (colorType 6), non-interlaced PNG. */
function makePng(width, height, pixelAt) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  const stride = 1 + width * 4;
  const raw = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelAt(x, y);
      const o = y * stride + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hashing + image introspection
// ─────────────────────────────────────────────────────────────────────────────

describe("Logo pipeline - hashing & image introspection", () => {
  it("hashBuffer is a stable sha256 hex digest", () => {
    const h1 = hashBuffer(Buffer.from("abc"));
    const h2 = hashBuffer(Buffer.from("abc"));
    assert.equal(h1, h2);
    assert.match(h1, /^[a-f0-9]{64}$/);
    assert.notEqual(h1, hashBuffer(Buffer.from("abd")));
  });

  it("readImageInfo reads PNG dimensions and format", () => {
    const png = makePng(96, 48, () => [10, 20, 30, 255]);
    const info = readImageInfo(png, "image/png");
    assert.deepEqual(info, { width: 96, height: 48, format: "png" });
  });

  it("readImageInfo reads SVG viewBox / width+height", () => {
    const withAttrs = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"></svg>`
    );
    assert.deepEqual(readImageInfo(withAttrs, "image/svg+xml"), {
      width: 128,
      height: 128,
      format: "svg",
    });

    const withViewBox = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"></svg>`
    );
    assert.deepEqual(readImageInfo(withViewBox, "image/svg+xml"), {
      width: 256,
      height: 256,
      format: "svg",
    });
  });

  it("readImageInfo returns null for non-image bytes", () => {
    assert.equal(readImageInfo(Buffer.from("not an image at all"), "text/plain"), null);
  });

  it("analyzePng flags a single flat-color image (placeholder shape)", () => {
    const flat = makePng(80, 80, () => [200, 200, 200, 255]);
    const result = analyzePng(flat);
    assert.ok(result, "flat PNG should decode");
    assert.equal(result.allTransparent, false);
    assert.equal(result.uniqueColors, 1);
  });

  it("analyzePng flags a fully transparent image", () => {
    const transparent = makePng(80, 80, () => [0, 0, 0, 0]);
    const result = analyzePng(transparent);
    assert.ok(result, "transparent PNG should decode");
    assert.equal(result.allTransparent, true);
  });

  it("analyzePng accepts a multi-color image (a real logo)", () => {
    const rich = makePng(64, 64, (x, y) => [
      (x * 4) % 256,
      (y * 4) % 256,
      (x + y) % 256,
      255,
    ]);
    const result = analyzePng(rich);
    assert.ok(result, "rich PNG should decode");
    assert.equal(result.allTransparent, false);
    assert.ok(result.uniqueColors > 1, "should detect more than one color");
  });

  it("exposes a 64px minimum logo dimension", () => {
    assert.equal(MIN_LOGO_DIMENSION, 64);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Domain slug guessing
// ─────────────────────────────────────────────────────────────────────────────

describe("Logo pipeline - domain slug guessing", () => {
  it("strips the numeric variant: 'Devsinc 17' -> devsinc + devsinc17", () => {
    const slugs = buildDomainSlugs("Devsinc 17");
    assert.ok(slugs.includes("devsinc"), `expected devsinc in ${slugs}`);
    assert.ok(slugs.includes("devsinc17"), `expected devsinc17 in ${slugs}`);
  });

  it("strips legal/descriptor suffixes: 'Smart Working Solutions'", () => {
    const slugs = buildDomainSlugs("Smart Working Solutions");
    assert.ok(slugs.includes("smartworking"), `expected smartworking in ${slugs}`);
    assert.ok(!slugs.some((s) => s.includes("solution")), "suffix must be removed");
  });

  it("removes company suffixes like Inc / Ltd / Technologies", () => {
    const slugs = buildDomainSlugs("Acme Technologies, Inc.");
    assert.ok(slugs.includes("acme"), `expected acme in ${slugs}`);
  });

  it("returns [] for unusable names", () => {
    assert.deepEqual(buildDomainSlugs("!!!"), []);
    assert.deepEqual(buildDomainSlugs(""), []);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Website logo extraction
// ─────────────────────────────────────────────────────────────────────────────

describe("Logo pipeline - extract logo urls from website html", () => {
  const html = `
    <html><head>
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
      <link rel="icon" type="image/svg+xml" href="/favicon.svg">
      <meta property="og:image" content="https://cdn.acme.com/og.png">
      <meta name="twitter:image" content="/twitter.png">
    </head><body>
      <header><img src="/assets/company-logo.svg" alt="Acme logo"></header>
      <img src="/hero.jpg" alt="office photo">
    </body></html>`;

  it("collects icons, og:image and the header logo (absolute)", () => {
    const urls = extractLogoUrlsFromHtml(html, "https://acme.com");
    assert.ok(urls.includes("https://acme.com/apple-touch-icon.png"));
    assert.ok(urls.includes("https://acme.com/favicon.svg"));
    assert.ok(urls.includes("https://cdn.acme.com/og.png"));
    assert.ok(urls.includes("https://acme.com/twitter.png"));
    assert.ok(urls.includes("https://acme.com/assets/company-logo.svg"));
  });

  it("prefers apple-touch-icon first and ignores non-logo images", () => {
    const urls = extractLogoUrlsFromHtml(html, "https://acme.com");
    assert.equal(urls[0], "https://acme.com/apple-touch-icon.png");
    assert.ok(!urls.includes("https://acme.com/hero.jpg"));
  });

  it("skips data: uris and dedupes", () => {
    const dup = `<link rel="icon" href="data:image/png;base64,AAA"><link rel="icon" href="/f.png"><link rel="icon" href="/f.png">`;
    const urls = extractLogoUrlsFromHtml(dup, "https://acme.com");
    assert.deepEqual(urls, ["https://acme.com/f.png"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Letter avatar (Step 3 - guaranteed fallback)
// ─────────────────────────────────────────────────────────────────────────────

describe("Letter avatar - deterministic fallback", () => {
  it("hashCompanyName is deterministic and order-sensitive", () => {
    assert.equal(hashCompanyName("Acme"), hashCompanyName("Acme"));
    assert.notEqual(hashCompanyName("Acme"), hashCompanyName("acme "));
    assert.ok(hashCompanyName("Acme") >= 0, "hash must be non-negative");
  });

  it("getLetterAvatarStyles is stable per company", () => {
    const a = getLetterAvatarStyles("Devsinc 17");
    const b = getLetterAvatarStyles("Devsinc 17");
    assert.deepEqual(a, b);
    // Soft pastel background + darker same-hue text.
    assert.notEqual(a.bg, a.color);
    assert.match(a.bg, /^#[0-9a-f]{6}$/i);
    assert.match(a.color, /^#[0-9a-f]{6}$/i);
    assert.match(a.border, /^#[0-9a-f]{6}$/i);
  });

  it("never uses emerald or teal hues", () => {
    const forbidden = new Set(["#10b981", "#34d399", "#059669", "#14b8a6", "#0d9488", "#0f766e"]);
    for (const name of ["Acme", "Devsinc 17", "Soum", "Huzzle", "Smart Working Solutions"]) {
      const s = getLetterAvatarStyles(name);
      for (const value of [s.bg, s.color, s.border]) {
        assert.ok(!forbidden.has(value.toLowerCase()), `forbidden hue ${value} for ${name}`);
      }
    }
  });

  it("getAvatarLetter uses the first alphanumeric char, uppercase", () => {
    assert.equal(getAvatarLetter("acme"), "A");
    assert.equal(getAvatarLetter("  devsinc 17"), "D");
    assert.equal(getAvatarLetter("17 Devsinc"), "1");
    assert.equal(getAvatarLetter("-Soum"), "S");
    assert.equal(getAvatarLetter("!!!"), "?");
    assert.equal(getAvatarLetter(""), "?");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Data cleaning (Step 5 bug: skills leaking into location)
// ─────────────────────────────────────────────────────────────────────────────

describe("Cleaner - text sanitization", () => {
  it("strips markdown headers, bold, links and html", () => {
    assert.equal(sanitizeText("##### Senior **Python** Dev"), "Senior Python Dev");
    assert.equal(sanitizeText("See [docs](https://x.com) now"), "See docs now");
    assert.equal(sanitizeText("Hello<br/>World"), "Hello World");
    assert.equal(sanitizeText("a &amp; b"), "a & b");
  });

  it("returns '' when only punctuation remains", () => {
    assert.equal(sanitizeText("#####"), "");
    assert.equal(sanitizeText("***"), "");
    assert.equal(sanitizeText(null), "");
  });
});

describe("Cleaner - skill list detection (location leak fix)", () => {
  it("identifies known technology tokens", () => {
    assert.equal(isKnownSkillToken("docker"), true);
    assert.equal(isKnownSkillToken("Kubernetes"), true);
    assert.equal(isKnownSkillToken("Dubai"), false);
  });

  it("treats comma separated tech lists as skills, not locations", () => {
    assert.equal(looksLikeSkillList("Docker, Kubernetes"), true);
    assert.equal(looksLikeSkillList("Python, AWS, React"), true);
    assert.equal(looksLikeSkillList("React / Node / Redis"), true);
    assert.equal(looksLikeSkillList("Docker and Kubernetes"), true);
  });

  it("keeps real places as locations", () => {
    assert.equal(looksLikeSkillList("Dubai, UAE"), false);
    assert.equal(looksLikeSkillList("Lahore, Pakistan"), false);
    assert.equal(looksLikeSkillList("Remote"), false);
  });

  it("cleanLocation drops skill lists and duplicated work modes", () => {
    assert.equal(cleanLocation("Docker, Kubernetes", "On-site"), null);
    assert.equal(cleanLocation("Remote", "Remote"), null);
    assert.equal(cleanLocation("Competitive", "On-site"), null);
    assert.equal(cleanLocation("", "On-site"), null);
    assert.equal(cleanLocation("Dubai, UAE", "On-site"), "Dubai, UAE");
  });
});

describe("Cleaner - title, salary and skill chips", () => {
  it("hides a title that is just the company name", () => {
    assert.equal(cleanJobTitle("Smart Working Solutions", "Smart Working Solutions", null), "");
  });

  it("falls back to the first clean description sentence", () => {
    assert.equal(
      cleanJobTitle("Smart Working Solutions", "Smart Working Solutions", "We build great software."),
      "We build great software"
    );
  });

  it("keeps a real distinct role title", () => {
    assert.equal(cleanJobTitle("Senior ML Engineer", "Acme", "…"), "Senior ML Engineer");
  });

  it("strips board suffixes from titles", () => {
    assert.equal(cleanJobTitle("Data Engineer | Greenhouse", "Acme", null), "Data Engineer");
  });

  it("rejects placeholder salaries", () => {
    assert.equal(cleanSalary("Competitive"), null);
    assert.equal(cleanSalary("Undisclosed"), null);
    assert.equal(cleanSalary("$120k - $150k"), "$120k - $150k");
  });

  it("dedupes and drops generic skill chips", () => {
    assert.deepEqual(
      cleanSkillTags(["React", "react", "Remote", "Competitive", "Node"]),
      ["React", "Node"]
    );
    assert.deepEqual(cleanSkillTags(null), []);
  });
});
