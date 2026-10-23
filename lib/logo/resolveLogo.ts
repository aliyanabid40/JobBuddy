/**
 * @file lib/logo/resolveLogo.ts
 * Server-only logo resolution + validation for JobBuddy.
 *
 * Pipeline (stops at the first VALID image):
 *   Step 1  Domain discovery  -> source field -> links in the job content -> name/slug guessing
 *   Step 2  Logo discovery    -> source API logo -> company website icons/og:image/header logo
 *                               -> logo API (Brandfetch / logo.dev) -> favicon services
 *   Step 3  Validation        -> reject failed requests, non-images, < 64px, generic default
 *                               globes (hash blacklist), ATS own logos, flat/transparent images
 *   Step 4  Cache & serve     -> caller persists `logoUrl` + `checkedAt`; nulls retried after 7 days
 *   Step 5  Fallback          -> deterministic letter avatar (never a generic globe)
 *
 * Every candidate is recorded in `attempts` so the caller can print a full
 * diagnostic table (url, status, content-type, size, bytes, hash, reason).
 */

import crypto from "crypto";
import zlib from "zlib";
import type { LogoAttempt, LogoSource, ResolvedLogoResult } from "./letter-avatar";

export type { LogoAttempt, LogoSource, ResolvedLogoResult };

/** Domains that are job boards / social / AI crawlers - never a company website. */
const ATS_AND_SOCIAL_HOSTS = [
  "lever.co",
  "greenhouse.io",
  "workable.com",
  "wellfound.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
  "github.com",
  "youtube.com",
  "medium.com",
  "crunchbase.com",
  "google.com",
  "glassdoor.com",
  "indeed.com",
  "builtin.com",
  "ziprecruiter.com",
  "angel.co",
];

/** Legal / descriptor suffixes stripped when guessing a domain from a name. */
const LEGAL_SUFFIXES_REGEX =
  /\b(inc|incorporated|ltd|limited|llc|l\.l\.c|pvt|private|technologies|technology|tech|corp|corporation|co|company|group|holdings|solutions|software|labs|global|hq|ventures|interactive|digital|studio|studios|systems|services|networks|data|health|therapeutics|international|consulting|agency)\b/gi;

/** Minimum natural size before an image is considered "sharp enough". */
export const MIN_LOGO_DIMENSION = 64;

/** Failed (null) logo results are retried after this many days. */
export const LOGO_RETRY_DAYS = 7;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) JobBuddyLogoBot/1.0";

// ─────────────────────────────────────────────────────────────────────────────
// Hashing
// ─────────────────────────────────────────────────────────────────────────────

export function hashBuffer(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic default-icon blacklist (computed from bogus-domain lookups)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hashes of the placeholder images that favicon services return for unknown
 * domains. Computed once, lazily, by requesting a domain that cannot exist and
 * hashing whatever comes back. This is what makes the generic globe detectable.
 */
let genericIconHashesPromise: Promise<Set<string>> | null = null;

const BOGUS_DOMAIN = "zzzz-not-a-real-domain-12345.invalid";

/** Static hashes of known defaults (belt & braces in case the network check fails). */
const STATIC_BLACKLISTED_HASHES = [
  // Google favicon service default globe (legacy hash kept from previous revision)
  "f1d7d0259d64e9a8f407b8b7049ee58693d25df1f6e6ec136d8d641d440c9d7d",
  // 1x1 transparent GIF
  "58c1f0340179a32c45164c01f652f14300e57207038e211910604104279b9087",
];

export function getGenericIconHashes(): Promise<Set<string>> {
  if (!genericIconHashesPromise) {
    genericIconHashesPromise = (async () => {
      const hashes = new Set<string>(STATIC_BLACKLISTED_HASHES);
      const probes = [
        `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${BOGUS_DOMAIN}&size=128`,
        `https://www.google.com/s2/favicons?domain=${BOGUS_DOMAIN}&sz=128`,
        `https://icons.duckduckgo.com/ip3/${BOGUS_DOMAIN}.ico`,
      ];
      await Promise.all(
        probes.map(async (probe) => {
          try {
            const res = await fetch(probe, {
              signal: AbortSignal.timeout(4000),
              headers: { "User-Agent": USER_AGENT },
            });
            if (!res.ok) return;
            const buf = Buffer.from(await res.arrayBuffer());
            if (buf.length > 0) hashes.add(hashBuffer(buf));
          } catch {
            // probe unavailable - the static list still protects us
          }
        })
      );
      return hashes;
    })();
  }
  return genericIconHashesPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Image inspection (dimensions, flat / transparent detection)
// ─────────────────────────────────────────────────────────────────────────────

export interface ImageInfo {
  width: number;
  height: number;
  format: string;
}

function readPngSize(buf: Buffer): ImageInfo | null {
  if (buf.length < 24) return null;
  if (buf[0] !== 0x89 || buf.toString("ascii", 1, 4) !== "PNG") return null;
  // IHDR always follows the 8-byte signature
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), format: "png" };
}

function readGifSize(buf: Buffer): ImageInfo | null {
  if (buf.length < 10 || buf.toString("ascii", 0, 3) !== "GIF") return null;
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8), format: "gif" };
}

function readJpegSize(buf: Buffer): ImageInfo | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buf[offset + 1];
    // SOF markers that carry dimensions
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof) {
      return {
        height: buf.readUInt16BE(offset + 5),
        width: buf.readUInt16BE(offset + 7),
        format: "jpeg",
      };
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    const segLength = buf.readUInt16BE(offset + 2);
    if (segLength <= 0) break;
    offset += 2 + segLength;
  }
  return null;
}

function readWebpSize(buf: Buffer): ImageInfo | null {
  if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF") return null;
  if (buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { width: w, height: h, format: "webp" };
  }
  if (chunk === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
      format: "webp",
    };
  }
  if (chunk === "VP8 ") {
    return {
      width: buf.readUInt16LE(26) & 0x3fff,
      height: buf.readUInt16LE(28) & 0x3fff,
      format: "webp",
    };
  }
  return null;
}

function readIcoSize(buf: Buffer): ImageInfo | null {
  if (buf.length < 6 || buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) return null;
  const count = buf.readUInt16LE(4);
  let width = 0;
  let height = 0;
  for (let i = 0; i < count; i++) {
    const entry = 6 + i * 16;
    if (entry + 2 > buf.length) break;
    const w = buf[entry] === 0 ? 256 : buf[entry];
    const h = buf[entry + 1] === 0 ? 256 : buf[entry + 1];
    width = Math.max(width, w);
    height = Math.max(height, h);
  }
  if (!width || !height) return null;
  return { width, height, format: "ico" };
}

function readSvgSize(text: string): ImageInfo | null {
  const svgTag = /<svg[^>]*>/i.exec(text)?.[0];
  if (!svgTag) return null;
  const w = /width=["']?\s*([\d.]+)/i.exec(svgTag);
  const h = /height=["']?\s*([\d.]+)/i.exec(svgTag);
  if (w && h) {
    return { width: Math.round(Number(w[1])), height: Math.round(Number(h[1])), format: "svg" };
  }
  const viewBox = /viewBox=["']\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(svgTag);
  if (viewBox) {
    return { width: Math.round(Number(viewBox[1])), height: Math.round(Number(viewBox[2])), format: "svg" };
  }
  return null;
}

/** Detect image format + natural dimensions from raw bytes (no image library needed). */
export function readImageInfo(buffer: Buffer, contentType?: string | null): ImageInfo | null {
  try {
    const isTextLike =
      (contentType ?? "").includes("svg") ||
      buffer.subarray(0, 300).toString("utf8").includes("<svg");
    if (isTextLike) {
      return readSvgSize(buffer.toString("utf8"));
    }
    return (
      readPngSize(buffer) ??
      readGifSize(buffer) ??
      readIcoSize(buffer) ??
      readWebpSize(buffer) ??
      readJpegSize(buffer)
    );
  } catch {
    return null;
  }
}

/**
 * Decode a PNG and report whether it is fully transparent or a single flat
 * color (the two shapes generic placeholder icons take).
 * Returns null when the PNG can't be decoded (then we simply skip these checks).
 */
export function analyzePng(buffer: Buffer): {
  allTransparent: boolean;
  uniqueColors: number;
} | null {
  try {
    if (readPngSize(buffer) === null) return null;

    let offset = 8;
    let width = 0;
    let height = 0;
    let bitDepth = 8;
    let colorType = 6;
    let interlace = 0;
    let palette: Buffer | null = null;
    let transparency: Buffer | null = null;
    const idat: Buffer[] = [];

    while (offset + 8 <= buffer.length) {
      const length = buffer.readUInt32BE(offset);
      const type = buffer.toString("ascii", offset + 4, offset + 8);
      const dataStart = offset + 8;
      const data = buffer.subarray(dataStart, dataStart + length);

      if (type === "IHDR") {
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        bitDepth = data[8];
        colorType = data[9];
        interlace = data[12];
      } else if (type === "IDAT") {
        idat.push(Buffer.from(data));
      } else if (type === "PLTE") {
        palette = Buffer.from(data);
      } else if (type === "tRNS") {
        transparency = Buffer.from(data);
      } else if (type === "IEND") {
        break;
      }
      offset = dataStart + length + 4;
    }

    // Only the simplest (and overwhelmingly most common) layout is analysed:
    // 8-bit, non-interlaced. Anything else is accepted as-is.
    if (!width || !height || bitDepth !== 8 || interlace !== 0 || idat.length === 0) {
      return null;
    }
    // Skip expensive work on very large images.
    if (width * height > 4_000_000) return null;

    const channels =
      colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 4 ? 2 : 4;
    const bpp = channels;

    const raw = zlib.inflateSync(Buffer.concat(idat));
    const stride = width * bpp;
    const pixels = Buffer.alloc(stride * height);

    let rawPos = 0;
    for (let y = 0; y < height; y++) {
      const filter = raw[rawPos++];
      const rowStart = y * stride;
      const prevStart = (y - 1) * stride;
      for (let x = 0; x < stride; x++) {
        const byte = raw[rawPos++];
        const left = x >= bpp ? pixels[rowStart + x - bpp] : 0;
        const up = y > 0 ? pixels[prevStart + x] : 0;
        const upLeft = y > 0 && x >= bpp ? pixels[prevStart + x - bpp] : 0;
        let value = byte;
        switch (filter) {
          case 0:
            break;
          case 1:
            value = byte + left;
            break;
          case 2:
            value = byte + up;
            break;
          case 3:
            value = byte + ((left + up) >> 1);
            break;
          case 4: {
            const p = left + up - upLeft;
            const pa = Math.abs(p - left);
            const pb = Math.abs(p - up);
            const pc = Math.abs(p - upLeft);
            const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
            value = byte + predictor;
            break;
          }
          default:
            return null;
        }
        pixels[rowStart + x] = value & 0xff;
      }
    }

    const colors = new Set<number>();
    let opaquePixels = 0;

    for (let i = 0; i < width * height; i++) {
      const p = i * bpp;
      let r: number;
      let g: number;
      let b: number;
      let a = 255;

      if (colorType === 0) {
        r = g = b = pixels[p];
      } else if (colorType === 2) {
        r = pixels[p];
        g = pixels[p + 1];
        b = pixels[p + 2];
      } else if (colorType === 3) {
        const index = pixels[p];
        if (!palette || index * 3 + 2 >= palette.length) return null;
        r = palette[index * 3];
        g = palette[index * 3 + 1];
        b = palette[index * 3 + 2];
        if (transparency && index < transparency.length) a = transparency[index];
      } else if (colorType === 4) {
        r = g = b = pixels[p];
        a = pixels[p + 1];
      } else {
        r = pixels[p];
        g = pixels[p + 1];
        b = pixels[p + 2];
        a = pixels[p + 3];
      }

      if (a > 0) opaquePixels++;
      // Quantise slightly so antialiasing noise doesn't look like many colors.
      colors.add(((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3));
      if (colors.size > 8) break;
    }

    return { allTransparent: opaquePixels === 0, uniqueColors: colors.size };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetching + validation
// ─────────────────────────────────────────────────────────────────────────────

interface FetchedImage {
  status: number | null;
  contentType: string | null;
  buffer: Buffer | null;
  error?: string;
}

async function fetchImage(url: string, timeoutMs = 5000): Promise<FetchedImage> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": USER_AGENT, Accept: "image/*,*/*;q=0.8" },
    });
    const contentType = res.headers.get("content-type");
    if (!res.ok) {
      return { status: res.status, contentType, buffer: null, error: `HTTP ${res.status}` };
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    return { status: res.status, contentType, buffer };
  } catch (err) {
    return {
      status: null,
      contentType: null,
      buffer: null,
      error: err instanceof Error ? err.message : "fetch failed",
    };
  }
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function isAtsOrSocial(url: string): boolean {
  const host = hostnameOf(url);
  if (!host) return false;
  return ATS_AND_SOCIAL_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
}

/** Is this the job board's own brand asset (Lever/Greenhouse/Workable/Wellfound)? */
function isAtsBrandAsset(host: string): boolean {
  return ["lever.co", "greenhouse.io", "workable.com", "wellfound.com"].some(
    (d) => host === d || host.endsWith(`.${d}`)
  );
}

/**
 * Validate a candidate logo image. Returns the attempt record (with `accepted`)
 * so the caller can log exactly why an image was rejected.
 */
export async function validateLogoCandidate(url: string): Promise<LogoAttempt> {
  const attempt: LogoAttempt = {
    url,
    status: null,
    contentType: null,
    width: null,
    height: null,
    bytes: 0,
    hash: "",
    accepted: false,
    reason: "not attempted",
  };

  if (!url || !url.startsWith("http")) {
    attempt.reason = "not an absolute http(s) url";
    return attempt;
  }

  const host = hostnameOf(url) ?? "";
  if (isAtsBrandAsset(host)) {
    attempt.reason = "url belongs to an ATS/job-board domain";
    return attempt;
  }

  const fetched = await fetchImage(url);
  attempt.status = fetched.status;
  attempt.contentType = fetched.contentType;

  if (!fetched.buffer) {
    attempt.reason = fetched.error ?? "request failed";
    return attempt;
  }

  attempt.bytes = fetched.buffer.length;
  attempt.hash = hashBuffer(fetched.buffer);

  const type = (fetched.contentType ?? "").toLowerCase();
  const looksLikeImage =
    type.includes("image") || type.includes("svg") || type.includes("octet-stream");
  if (!looksLikeImage) {
    attempt.reason = `non-image content-type (${fetched.contentType ?? "unknown"})`;
    return attempt;
  }

  if (fetched.buffer.length < 200) {
    attempt.reason = "empty or truncated body";
    return attempt;
  }

  const info = readImageInfo(fetched.buffer, type);
  if (!info) {
    attempt.reason = "could not read image dimensions";
    return attempt;
  }
  attempt.width = info.width;
  attempt.height = info.height;

  if (Math.max(info.width, info.height) < MIN_LOGO_DIMENSION) {
    attempt.reason = `smaller than ${MIN_LOGO_DIMENSION}x${MIN_LOGO_DIMENSION} (${info.width}x${info.height})`;
    return attempt;
  }

  const blacklist = await getGenericIconHashes();
  if (blacklist.has(attempt.hash)) {
    attempt.reason = "generic default icon (blacklisted hash)";
    return attempt;
  }

  if (info.format === "png") {
    const analysis = analyzePng(fetched.buffer);
    if (analysis) {
      if (analysis.allTransparent) {
        attempt.reason = "fully transparent image";
        return attempt;
      }
      if (analysis.uniqueColors <= 1) {
        attempt.reason = "single flat color image";
        return attempt;
      }
    }
  }

  attempt.accepted = true;
  attempt.reason = "ok";
  return attempt;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 - company domain discovery
// ─────────────────────────────────────────────────────────────────────────────

/** Turn a company name into domain candidate slugs. */
export function buildDomainSlugs(companyName: string): string[] {
  const base = (companyName || "")
    .toLowerCase()
    .replace(LEGAL_SUFFIXES_REGEX, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();

  if (!base) return [];

  const compact = base.replace(/\s+/g, "");
  const words = base.split(/\s+/).filter(Boolean);
  const withoutNumbers = compact.replace(/\d+$/, "");

  const candidates = new Set<string>();
  if (compact.length >= 3) candidates.add(compact);
  // "Devsinc 17" -> also try "devsinc"
  if (withoutNumbers && withoutNumbers.length >= 3 && withoutNumbers !== compact) {
    candidates.add(withoutNumbers);
  }
  // "Smart Working Solutions" -> also try "smartworking" / "smart"
  if (words.length > 1) {
    const firstTwo = words.slice(0, 2).join("");
    if (firstTwo.length >= 4) candidates.add(firstTwo);
    const first = words[0];
    if (first.length >= 5) candidates.add(first);
  }

  return Array.from(candidates).filter((s) => /^[a-z0-9]{3,}$/.test(s));
}

const DOMAIN_TLDS = ["com", "io", "ai", "co", "com.pk", "ae"];

/** Tokens used to loosely confirm that a guessed domain really belongs to the company. */
function companyTokens(companyName: string): string[] {
  const words = (companyName || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4);
  return Array.from(new Set(words));
}

async function fetchSiteText(domain: string, timeoutMs = 3000): Promise<string | null> {
  for (const scheme of ["https", "http"]) {
    try {
      const res = await fetch(`${scheme}://${domain}`, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
      });
      if (res.ok) return await res.text();
    } catch {
      // try next scheme
    }
  }
  return null;
}

/**
 * Resolve the company's *own* website domain.
 * Order: source-provided field -> website links inside the job content ->
 * slug/TLD guessing confirmed by fetching the page.
 */
export async function resolveCompanyDomain(
  companyName: string,
  jobDescription?: string,
  sourceDomain?: string | null
): Promise<string | null> {
  const cleanCompany = (companyName || "").trim();
  if (!cleanCompany) return null;

  // 1.1 Domain explicitly provided by the source API / ATS payload
  if (sourceDomain) {
    const host = sourceDomain
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .replace(/^www\./i, "")
      .toLowerCase();
    if (host.includes(".") && !isAtsOrSocial(`https://${host}`)) return host;
  }

  // 1.2 A real company website link inside the job content
  if (jobDescription) {
    const urls = jobDescription.match(/https?:\/\/[^\s"'<>()]+/g) ?? [];
    for (const rawUrl of urls) {
      const host = hostnameOf(rawUrl);
      if (!host || !host.includes(".")) continue;
      if (isAtsOrSocial(rawUrl)) continue;
      // Skip bare CDN/asset hosts
      if (/^(cdn|images?|static|assets|media)\./.test(host)) continue;
      return host;
    }
  }

  // 1.3 Guess from the name / board slug, confirmed by fetching the homepage
  const tokens = companyTokens(cleanCompany);
  for (const slug of buildDomainSlugs(cleanCompany)) {
    for (const tld of DOMAIN_TLDS) {
      const candidate = `${slug}.${tld}`;
      const html = await fetchSiteText(candidate, 2000);
      if (!html) continue;

      const haystack = html.toLowerCase();
      const matches =
        tokens.length === 0 ||
        tokens.some((t) => haystack.includes(t)) ||
        haystack.includes(slug);
      if (matches) return candidate;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 - logo URL discovery
// ─────────────────────────────────────────────────────────────────────────────

/** Pull candidate icon / logo URLs out of a homepage's HTML, best first. */
export function extractLogoUrlsFromHtml(html: string, baseUrl: string): string[] {
  const candidates: string[] = [];
  const push = (raw?: string | null) => {
    if (!raw) return;
    const value = raw.trim().replace(/^["']|["']$/g, "");
    if (!value || value.startsWith("data:")) return;
    try {
      const absolute = new URL(value, baseUrl).toString();
      if (!candidates.includes(absolute)) candidates.push(absolute);
    } catch {
      // ignore malformed urls
    }
  };

  // apple-touch-icon (often the highest-quality square logo)
  for (const m of html.matchAll(
    /<link[^>]+rel=["']?(?:apple-touch-icon|apple-touch-icon-precomposed)["']?[^>]*>/gi
  )) {
    push(/href=["']([^"']+)["']/i.exec(m[0])?.[1]);
  }

  // <link rel="icon"> across all variants
  for (const m of html.matchAll(/<link[^>]+rel=["']?(?:shortcut icon|icon|mask-icon)["']?[^>]*>/gi)) {
    push(/href=["']([^"']+)["']/i.exec(m[0])?.[1]);
  }

  // og:image / twitter:image
  push(
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1]
  );
  push(
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1]
  );

  // Header logo <img>
  for (const m of html.matchAll(/<img[^>]+>/gi)) {
    const tag = m[0];
    const alt = /alt=["']([^"']*)["']/i.exec(tag)?.[1] ?? "";
    const src = /src=["']([^"']+)["']/i.exec(tag)?.[1] ?? "";
    if (/logo|brand/i.test(alt) || /logo|brand/i.test(src)) push(src);
  }

  return candidates;
}

/** Direct logo field returned by the source API (if any). */
function normaliseSourceLogo(hintLogoUrl?: string | null): string | null {
  if (!hintLogoUrl) return null;
  const value = hintLogoUrl.trim();
  if (!value.startsWith("http")) return null;
  return value;
}

/**
 * Resolve the best valid logo for a company.
 * `sourceDomain` is an optional domain from the source payload.
 */
export async function resolveCompanyLogo(
  companyName: string,
  hintLogoUrl?: string | null,
  jobDescription?: string,
  sourceDomain?: string | null
): Promise<ResolvedLogoResult> {
  const attempts: LogoAttempt[] = [];
  let domain: string | null = null;

  const tryCandidate = async (
    url: string,
    source: LogoSource
  ): Promise<ResolvedLogoResult | null> => {
    const attempt = await validateLogoCandidate(url);
    attempts.push(attempt);
    if (!attempt.accepted) return null;
    return {
      company: companyName,
      domain: domain,
      logoUrl: url,
      source,
      width: attempt.width,
      height: attempt.height,
      attempts,
    };
  };

  // Step 2.1 - logo handed to us by the source API / ATS payload
  const sourceLogo = normaliseSourceLogo(hintLogoUrl);
  if (sourceLogo) {
    const result = await tryCandidate(sourceLogo, "source_api");
    if (result) return result;
  }

  // Step 1 - discover the company domain
  domain = await resolveCompanyDomain(companyName, jobDescription, sourceDomain);

  if (domain) {
    // Step 2.2 - the company's own website
    const html = await fetchSiteText(domain, 4000);
    if (html) {
      const websiteCandidates = extractLogoUrlsFromHtml(html, `https://${domain}`);
      for (const candidate of websiteCandidates) {
        const result = await tryCandidate(candidate, "website");
        if (result) return result;
      }
    }

    // Step 2.3 - logo APIs (keyed services first; Clearbit is discontinued, never used)
    const logoApiCandidates: string[] = [];
    const brandfetchKey = process.env.BRANDFETCH_API_KEY;
    if (brandfetchKey) {
      logoApiCandidates.push(`https://cdn.brandfetch.io/${domain}/w/256/h/256?c=${brandfetchKey}`);
    }
    const logoDevKey = process.env.LOGO_DEV_API_KEY;
    if (logoDevKey) {
      logoApiCandidates.push(`https://img.logo.dev/${domain}?token=${logoDevKey}&size=256`);
    }
    for (const candidate of logoApiCandidates) {
      const result = await tryCandidate(candidate, "logo_api");
      if (result) return result;
    }

    // Step 2.4 - favicon services as the last real-image source
    const faviconCandidates = [
      `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    ];
    for (const candidate of faviconCandidates) {
      const result = await tryCandidate(candidate, "favicon");
      if (result) return result;
    }
  }

  // Step 5 - deterministic letter avatar (no image URL at all)
  return {
    company: companyName,
    domain,
    logoUrl: null,
    source: "letter_avatar",
    width: null,
    height: null,
    attempts,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch helpers + diagnostics
// ─────────────────────────────────────────────────────────────────────────────

export interface LogoResolveInput {
  company: string;
  company_logo?: string | null;
  company_domain?: string | null;
  description?: string;
  job_url?: string;
}

/** In-process memo so a company is resolved once per server instance. */
const RESOLUTION_CACHE = new Map<string, { result: ResolvedLogoResult; at: number }>();

/**
 * Resolve logos for a list of jobs with a bounded concurrency (~5) so job
 * loading never blocks on logo discovery. Duplicate companies are collapsed
 * and each company is resolved at most once every LOGO_RETRY_DAYS.
 */
export async function batchResolveLogos(
  jobs: LogoResolveInput[],
  concurrency = 5
): Promise<ResolvedLogoResult[]> {
  const unique = new Map<string, LogoResolveInput>();
  for (const job of jobs) {
    const key = (job.company || "").trim().toLowerCase();
    if (!key || unique.has(key)) continue;
    unique.set(key, job);
  }

  const list = Array.from(unique.values());
  const results: ResolvedLogoResult[] = new Array(list.length);
  const memoCutoff = Date.now() - LOGO_RETRY_DAYS * 24 * 60 * 60 * 1000;

  let cursor = 0;
  async function worker() {
    while (cursor < list.length) {
      const index = cursor++;
      const item = list[index];
      const key = item.company.trim().toLowerCase();
      const cached = RESOLUTION_CACHE.get(key);
      if (cached && cached.at > memoCutoff) {
        results[index] = cached.result;
        continue;
      }
      const resolved = await resolveCompanyLogo(
        item.company,
        item.company_logo,
        item.description,
        item.company_domain
      );
      RESOLUTION_CACHE.set(key, { result: resolved, at: Date.now() });
      results[index] = resolved;
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(list.length, 1)) }, () => worker())
  );

  return results;
}

/** Print the required company -> domain -> source table, including image size. */
export function logLogoResolutionTable(results: ResolvedLogoResult[]): void {
  if (results.length === 0) return;

  const real = results.filter((r) => r.logoUrl).length;
  const avatars = results.length - real;

  console.log(
    "\n========================= LOGO RESOLUTION SUMMARY ========================="
  );
  console.table(
    results.map((r) => ({
      Company: r.company,
      Domain: r.domain ?? "(none)",
      Source: r.source,
      Size: r.width && r.height ? `${r.width}x${r.height}` : "-",
      Logo: r.logoUrl ? `${r.logoUrl.slice(0, 60)}` : "(letter avatar)",
    }))
  );
  console.log(`Real logos: ${real} | Letter avatars: ${avatars} | Total: ${results.length}`);

  // Full attempt trace explains exactly why a logo was rejected.
  const attempts = results.flatMap((r) =>
    r.attempts.map((a) => ({
      Company: r.company,
      URL: a.url.slice(0, 70),
      Status: a.status ?? "-",
      "Content-Type": a.contentType ?? "-",
      Size: a.width && a.height ? `${a.width}x${a.height}` : "-",
      Bytes: a.bytes,
      Hash: a.hash ? a.hash.slice(0, 12) : "-",
      Result: a.accepted ? "CHOSEN" : `rejected: ${a.reason}`,
    }))
  );
  if (attempts.length > 0) {
    console.log("--- candidate attempts ---");
    console.table(attempts);
  }
  console.log("=========================================================================\n");
}
