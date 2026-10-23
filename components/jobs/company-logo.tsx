"use client";

import React, { useState } from "react";
import { getAvatarLetter, getLetterAvatarStyles } from "@/lib/logo/letter-avatar";

/** Below this natural size an image is treated as a blurry favicon and rejected. */
const MIN_LOGO_DIMENSION = 64;

interface CompanyLogoProps {
  company: string;
  logoUrl?: string | null;
  className?: string;
}

/**
 * Company logo box.
 *
 * The deterministic letter avatar is always rendered first; the real logo is
 * only revealed once it has fully loaded AND passed the minimum-size check.
 * That guarantees no flash of a generic globe, no broken-image icon and no
 * layout shift.
 *
 * The loaded/failed URL is tracked against the current candidate (rather than
 * reset through an effect), so a new `logoUrl` automatically hides the previous
 * image until the new one has proven valid.
 */
export function CompanyLogo({
  company,
  logoUrl,
  className = "",
}: CompanyLogoProps) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const cleanCompany = (company || "Company").trim() || "Company";
  const avatarStyle = getLetterAvatarStyles(cleanCompany);
  const avatarLetter = getAvatarLetter(cleanCompany);

  const candidate = logoUrl && logoUrl.startsWith("http") ? logoUrl : null;
  const showImage =
    Boolean(candidate) && loadedUrl === candidate && failedUrl !== candidate;

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    if (!candidate) return;
    const img = event.currentTarget;
    const largest = Math.max(img.naturalWidth, img.naturalHeight);
    if (largest >= MIN_LOGO_DIMENSION) {
      setLoadedUrl(candidate);
    } else {
      setFailedUrl(candidate);
    }
  };

  return (
    <div
      role="img"
      aria-label={`${cleanCompany} logo`}
      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg border flex items-center justify-center overflow-hidden flex-shrink-0 relative transition-colors ${className}`}
      style={{
        backgroundColor: showImage ? "#ffffff" : avatarStyle.bg,
        borderColor: showImage ? "#e4e4e7" : avatarStyle.border,
      }}
    >
      {/* Letter avatar - shown until a valid logo has actually painted. */}
      {!showImage && (
        <span
          aria-hidden="true"
          className="font-semibold text-base sm:text-lg select-none"
          style={{ color: avatarStyle.color }}
        >
          {avatarLetter}
        </span>
      )}

      {candidate && failedUrl !== candidate && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={candidate}
          src={candidate}
          alt=""
          aria-hidden="true"
          decoding="async"
          className="absolute inset-0 w-full h-full object-contain p-1.5 transition-opacity duration-200"
          style={{ opacity: showImage ? 1 : 0 }}
          onLoad={handleLoad}
          onError={() => setFailedUrl(candidate)}
        />
      )}
    </div>
  );
}
