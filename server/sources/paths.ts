// Path helpers for the source registry's on-disk layout.
//
//   workspace/
//     sources/
//       <slug>.md                    ← source config
//       _index.md                    ← auto-generated category index
//       _state/
//         <slug>.json                ← runtime state per source
//         robots/<host>.txt          ← cached robots.txt
//     news/
//       daily/YYYY/MM/DD.md          ← daily aggregated summary
//       archive/<slug>/YYYY-MM.md    ← per-source rolling archive
//
// Everything is derived from a single `workspaceRoot` argument so
// tests can target a `mkdtempSync` directory.

import path from "node:path";

export const SOURCES_DIR = "sources";
export const SOURCE_STATE_DIR = "_state";
export const ROBOTS_CACHE_DIR = "robots";
export const NEWS_DIR = "news";
export const DAILY_DIR = "daily";
export const ARCHIVE_DIR = "archive";

export function sourcesRoot(workspaceRoot: string): string {
  return path.join(workspaceRoot, SOURCES_DIR);
}

export function sourceFilePath(workspaceRoot: string, slug: string): string {
  return path.join(sourcesRoot(workspaceRoot), `${slug}.md`);
}

export function sourceStateDir(workspaceRoot: string): string {
  return path.join(sourcesRoot(workspaceRoot), SOURCE_STATE_DIR);
}

export function sourceStatePath(workspaceRoot: string, slug: string): string {
  return path.join(sourceStateDir(workspaceRoot), `${slug}.json`);
}

export function robotsCacheDir(workspaceRoot: string): string {
  return path.join(sourceStateDir(workspaceRoot), ROBOTS_CACHE_DIR);
}

export function robotsCachePath(workspaceRoot: string, host: string): string {
  // Hosts can contain `:` (for explicit ports) which breaks on some
  // filesystems. Colons → underscore. Other characters are ASCII
  // letters, digits, dots, and hyphens per DNS rules so they're
  // safe as-is.
  const safe = host.replace(/:/g, "_");
  return path.join(robotsCacheDir(workspaceRoot), `${safe}.txt`);
}

export function newsRoot(workspaceRoot: string): string {
  return path.join(workspaceRoot, NEWS_DIR);
}

export function dailyNewsPath(workspaceRoot: string, isoDate: string): string {
  // Validate shape at the boundary so an empty / bogus date can't
  // produce "undefined/undefined/undefined.md" downstream.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) {
    throw new Error(
      `[sources] dailyNewsPath: expected YYYY-MM-DD, got "${isoDate}"`,
    );
  }
  const [, year, month, day] = m;
  return path.join(
    newsRoot(workspaceRoot),
    DAILY_DIR,
    year,
    month,
    `${day}.md`,
  );
}

export function archiveDir(workspaceRoot: string, slug: string): string {
  return path.join(newsRoot(workspaceRoot), ARCHIVE_DIR, slug);
}

export function archivePath(
  workspaceRoot: string,
  slug: string,
  yearMonth: string,
): string {
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    throw new Error(
      `[sources] archivePath: expected YYYY-MM, got "${yearMonth}"`,
    );
  }
  return path.join(archiveDir(workspaceRoot, slug), `${yearMonth}.md`);
}

// Very conservative slug validator. The slug doubles as a filename
// and appears in URLs (via the manageSource plugin), so reject
// anything that could surprise the filesystem or the URL parser.
// Letters, digits, hyphens only. 1-64 chars. No leading / trailing
// hyphen. No consecutive hyphens.
export function isValidSlug(slug: string): boolean {
  if (typeof slug !== "string") return false;
  if (slug.length === 0 || slug.length > 64) return false;
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) return false;
  if (slug.includes("--")) return false;
  return true;
}
