// URL normalization utilities for dedup + cache keys.
//
// The same article commonly arrives from multiple sources with
// different query strings (utm_source, fbclid, gclid, mc_cid, ...)
// or trailing slashes. We normalize before dedup so "same article
// different feed" collapses into one item.
//
// Pure — no I/O, fully testable.

// Tracking parameters we always strip. Case-insensitive on the
// parameter NAME only.
const TRACKING_PARAM_PREFIXES: readonly string[] = [
  "utm_",
  "mc_",
  "pk_",
  "hsa_",
];

const TRACKING_PARAMS: ReadonlySet<string> = new Set([
  "fbclid",
  "gclid",
  "msclkid",
  "dclid",
  "gbraid",
  "wbraid",
  "yclid",
  "ref",
  "ref_src",
  "ref_url",
  "share",
  "share_source",
  "trk",
  "igshid",
  "CMP",
]);

function isTrackingParam(name: string): boolean {
  const lower = name.toLowerCase();
  if (TRACKING_PARAMS.has(lower)) return true;
  for (const prefix of TRACKING_PARAM_PREFIXES) {
    if (lower.startsWith(prefix)) return true;
  }
  return false;
}

// Normalize a URL for use as a dedup key:
//
//   1. Parse it. Invalid → return null (caller decides fallback).
//   2. Lowercase the protocol + host.
//   3. Drop the fragment.
//   4. Drop tracking query params.
//   5. Sort remaining query params so different orderings hash the
//      same.
//   6. Collapse trailing slash on the pathname (except root "/").
//   7. Drop default ports (80 for http, 443 for https).
//
// Returns the normalized href on success, null on unparseable
// input.
export function normalizeUrl(raw: string): string | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  // protocol + host lowercase (URL already normalizes these but
  // doing it explicitly guards against future WHATWG tweaks).
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();

  // Drop fragment.
  url.hash = "";

  // Drop tracking params. Iterate on a snapshot because delete
  // mutates the underlying list.
  const paramNames = Array.from(url.searchParams.keys());
  for (const name of paramNames) {
    if (isTrackingParam(name)) url.searchParams.delete(name);
  }

  // Sort remaining params for deterministic ordering. Preserve
  // multi-value params by iterating all entries.
  const entries = Array.from(url.searchParams.entries());
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  // Clear and reinsert.
  for (const name of Array.from(url.searchParams.keys())) {
    url.searchParams.delete(name);
  }
  for (const [name, value] of entries) {
    url.searchParams.append(name, value);
  }

  // Collapse trailing slash on non-root paths.
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  // Drop default ports.
  if (
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  ) {
    url.port = "";
  }

  return url.toString();
}

// Stable content-addressed id for an item. Not cryptographically
// strong — fast hash suitable for in-memory Set membership and
// cross-run dedup. Node has `crypto.createHash` but we prefer a
// synchronous string-in / string-out helper that's easy to drop
// into a fetcher.
//
// Algorithm: FNV-1a 32-bit over the normalized URL, hex-encoded.
// Collisions are extremely rare at our item volume (tens of
// thousands over years). If dedup correctness ever depends on
// this, upgrade to sha-256 — but watch the bundle size for the
// Vue side if we ever ship this to the browser.
export function stableItemId(normalizedUrl: string): string {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < normalizedUrl.length; i++) {
    hash ^= normalizedUrl.charCodeAt(i);
    // Multiply by FNV prime (0x01000193), mask to 32-bit.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
