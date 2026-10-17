import React from "react";
import { Helmet } from "react-helmet-async";

export const SITE_NAME = "Dexter Auth";
export const SITE_URL = "https://dexterauth.com";
export const DEFAULT_DESC =
  "Dexter Auth is a free enterprise-grade authentication and licensing API for native C++, C#, and ImGui applications with HWID locking and reseller features.";

type SeoImage = "/og-image.png" | "/loader.svg" | "/favicon-dexter.svg";

export interface SeoOptions {
  /** Page title (the SITE_NAME suffix is appended automatically). */
  title: string;
  /** Meta description — keep under ~155 chars for clean SERP display. */
  description?: string;
  /** Pathname of this route, used to build the canonical + OG url. */
  path?: string;
  /** OG/Twitter card image (absolute or root-relative). */
  image?: SeoImage;
  /** Set false for noindex routes (e.g. dashboard). Default: allow indexing. */
  indexable?: boolean;
  /** Optional structured data; rendered as a JSON-LD <script> block safely inside Helmet. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Geotargeting region (default: US-CA). Set null to disable. */
  geoRegion?: string | null;
  /** Geotargeting placename (default: Silicon Valley). Set null to disable. */
  geoPlacename?: string | null;
  /** Geotargeting position coordinate pair (default: 37.3875;-122.0575). Set null to disable. */
  geoPosition?: string | null;
}

export const SEO: React.FC<SeoOptions> = ({
  title,
  description = DEFAULT_DESC,
  path = "",
  image = "/og-image.png",
  indexable = true,
  jsonLd,
  geoRegion = "US-CA",
  geoPlacename = "Silicon Valley",
  geoPosition = "37.3875;-122.0575",
}) => {
  const fullTitle = title === SITE_NAME ? `${SITE_NAME} | Best Free Authentication API for C++, C#, and ImGui` : `${title} — ${SITE_NAME}`;
  const url = `${SITE_URL}${path}`;
  const imageUrl = `${SITE_URL}${image}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      
      {/* Geotargeting (SEO/GEO) */}
      {geoRegion && <meta name="geo.region" content={geoRegion} />}
      {geoPlacename && <meta name="geo.placename" content={geoPlacename} />}
      {geoPosition && (
        <>
          <meta name="geo.position" content={geoPosition} />
          <meta name="ICBM" content={geoPosition.replace(";", ", ")} />
        </>
      )}
      
      {/* Robots Control */}
      <meta
        name="robots"
        content={
          indexable
            ? "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
            : "noindex, noarchive, noimageindex"
        }
      />
      
      {/* Canonical */}
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content="website" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(
            Array.isArray(jsonLd)
              ? {
                  "@context": "https://schema.org",
                  "@graph": jsonLd,
                }
              : jsonLd
          )}
        </script>
      )}
    </Helmet>
  );
};
