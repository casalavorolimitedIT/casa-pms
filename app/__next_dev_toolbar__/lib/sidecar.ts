// ─── Sidecar API calls ────────────────────────────────────────────────────────

export const SIDECAR =
  typeof process !== 'undefined' && (process.env as any).__DEV_TOOLBAR_PORT
    ? `http://localhost:${(process.env as any).__DEV_TOOLBAR_PORT}`
    : 'http://localhost:7777';

/** Returns null on success, or an error string on failure. */
export async function openInEditor(file: string, line: number, column = 1): Promise<string | null> {
  try {
    const res = await fetch(`${SIDECAR}/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file, line, column }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return (data as any).error ?? `HTTP ${res.status}`;
    }
    return null;
  } catch {
    return 'Sidecar not reachable — is withDevToolbar() in your next.config?';
  }
}

export interface SearchResult {
  file: string;
  line: number;
  preview: string;
  componentName?: string;
}

export async function fetchSearch(q: string): Promise<SearchResult[]> {
  const res = await fetch(`${SIDECAR}/search?q=${encodeURIComponent(q)}`);
  const data = await res.json();
  return data.results ?? [];
}

/**
 * Returns a map of relative file path → 'client' | 'server'.
 * Used by the boundary overlay to colour-code component boundaries.
 */
export async function fetchComponentTypes(): Promise<Record<string, 'client' | 'server'>> {
  try {
    const res = await fetch(`${SIDECAR}/component-types`);
    const data = await res.json();
    return data.types ?? {};
  } catch {
    return {};
  }
}
