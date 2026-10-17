import { useEffect } from "react";

/**
 * useSEO — lightweight, dependency-free head manager for this SPA.
 *
 * Client-side rendered apps ship a single index.html, so every route starts
 * with the *same* <title>/meta. This hook rewrites the relevant tags on
 * navigation so each route gets an accurate, keyword-rich title, description,
 * canonical URL, Open Graph / Twitter card, and optional JSON-LD block.
 *
 * It is idempotent: each call targets specific elements by a `data-seo` tag
 * and replaces them in place, so route changes never leak stale metadata.
 *
 * Why no react-helmet? This app only needs a handful of tags per route, and
 * Helmet adds ~6KB plus a render-phase head-diffing pass. For this surface
 * area a 60-line effect that runs once per navigation is cheaper and simpler.
 */

const SITE_NAME = "Dexter Auth";
const SITE_URL = "https://dexterauth.com";
const DEFAULT_DESC =
  "Dexter Auth is the fastest way to add authentication to your JavaScript app. HTTP-only cookie sessions, a JavaScript SDK, and an admin dashboard — no JWT glue code.";

type SeoImage =
  | "/og-image.png"
  | "/loader.svg"
  | "/favicon-dexter.svg";

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
  /** Optional structured data; rendered as a JSON-LD <script> block. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

/** Ensure a meta element exists and set its content; create it if missing. */
const upsertMeta = (
  attr: "name" | "property",
  key: string,
  content: string
) => {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    el.setAttribute("data-seo", "managed");
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

/** Canonical link element — one per page, swapped on navigation. */
const upsertCanonical = (url: string) => {
  let el = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]'
  );
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    el.setAttribute("data-seo", "managed");
    document.head.appendChild(el);
  }
  el.setAttribute("href", url);
};

const upsertRobots = (indexable: boolean) => {
  upsertMeta(
    "name",
    "robots",
    indexable ? "index, follow" : "noindex, nofollow"
  );
};

/** Render JSON-LD, removing any prior managed block first. */
const upsertJsonLd = (data: SeoOptions["jsonLd"]) => {
  const prev = document.head.querySelectorAll(
    'script[data-seo="jsonld"]'
  );
  prev.forEach((n) => n.remove());
  if (!data) return;
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.setAttribute("data-seo", "jsonld");
  script.text = JSON.stringify(data);
  document.head.appendChild(script);
};

export const useSEO = ({
  title,
  description = DEFAULT_DESC,
  path = "",
  image = "/og-image.png",
  indexable = true,
  jsonLd,
}: SeoOptions) => {
  useEffect(() => {
    const fullTitle =
      title === SITE_NAME ? title : `${title} — ${SITE_NAME}`;
    const url = `${SITE_URL}${path}`;

    document.title = fullTitle;
    upsertMeta("name", "description", description);
    upsertRobots(indexable);
    upsertCanonical(url);

    // Open Graph
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", `${SITE_URL}${image}`);
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:type", "website");

    // Twitter
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", `${SITE_URL}${image}`);

    upsertJsonLd(jsonLd);

    // Restore the landing defaults when the route unmounts.
    return () => {
      // Intentionally left in place: meta persists into the next route's
      // useSEO call, which overwrites it. Avoids a flash of empty meta.
    };
  }, [title, description, path, image, indexable, jsonLd]);
};

export { SITE_NAME, SITE_URL };
