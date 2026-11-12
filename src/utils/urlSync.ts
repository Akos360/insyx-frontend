/**
 * Builds a URLSearchParams from a flat record, omitting empty/default
 * values (undefined, null, "", false) — keeps a shared/bookmarked URL
 * minimal, showing only filters/sort/paging actually in effect.
 */
/**
 * Parses a URL-sourced numeric filter (year, min-works, etc.), returning
 * undefined for empty/non-numeric input instead of NaN — a crafted link like
 * ?yearFrom=abc would otherwise send the literal string "NaN" to the backend.
 */
export function toFiniteNumber(raw: string): number | undefined {
  const n = Number(raw);
  return raw !== '' && Number.isFinite(n) ? n : undefined;
}

export function toSearchParams(values: Record<string, string | number | boolean | undefined | null>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    params.set(key, String(value));
  }
  return params;
}
