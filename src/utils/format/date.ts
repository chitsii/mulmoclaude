// Pure date/time formatting helpers for the Vue frontend.
// All functions are locale-aware on purpose; tests assert
// structural properties only, not exact strings.

/** "Apr 11 06:32" — short month + day + 24h time. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

/** "Apr 11 06:32" — same format as formatDate but from epoch ms. */
export function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "06:32:15" — locale time string from epoch ms. */
export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString();
}

/** "06:32" — short HH:MM from ISO string. Falls back to raw string on parse error. */
export function formatShortTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** "Apr 11" — short month + day from epoch ms. */
export function formatShortDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** "14:32" for today, "Apr 16 14:32" for past dates. Works with
 *  both epoch ms (number) and ISO strings. */
export function formatSmartTime(value: number | string): string {
  const d = new Date(value);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (isToday) return time;
  const date = d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
  return `${date} ${time}`;
}
