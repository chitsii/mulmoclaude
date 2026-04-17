// Helpers for server-side fetch() calls. The MCP stdio bridge
// (`server/agent/mcp-server.ts`) makes multiple fetch calls to
// the host Express server and repeated the same error-extraction
// pattern at every call site.

/**
 * Extract a human-readable error string from a non-ok fetch Response.
 *
 * Tries to parse the body as `{ error: string }` (the shape every
 * MulmoClaude `/api/*` endpoint returns on failure). Falls back to
 * `"HTTP <status>"` when the body isn't JSON or doesn't contain an
 * `error` field.
 */
export async function extractFetchError(res: Response): Promise<string> {
  const errBody = (await res.json().catch(() => ({}))) as {
    error?: string;
  };
  return errBody.error ?? `HTTP ${res.status}`;
}
