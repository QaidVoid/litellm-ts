/**
 * Shared helpers for the route drift check.
 *
 * The SDK is hand-written, not generated, so it can silently drift from the
 * LiteLLM proxy it targets (a method/path the proxy never serves still
 * compiles). These helpers extract every route the SDK calls and compare it
 * against a pinned manifest of the routes LiteLLM actually registers.
 *
 * The manifest is built from the LiteLLM *source* at the pinned version, not a
 * running proxy: `openapi.json` only documents the public subset (it omits the
 * ~100 `include_in_schema=False` management routes) and `/routes` misses the
 * mounted sub-apps (MCP). The source registers all of them.
 *
 * See `scripts/snapshot-routes.ts` (regenerate the manifest) and
 * `scripts/check-routes.ts` (offline check, run in CI).
 */

const encoder = new TextEncoder();

/** Write a line to stdout. Used instead of `console` to satisfy `no-console`. */
export const out = (msg: string): void => {
  Deno.stdout.writeSync(encoder.encode(`${msg}\n`));
};

/** Write a line to stderr. */
export const errOut = (msg: string): void => {
  Deno.stderr.writeSync(encoder.encode(`${msg}\n`));
};

/** Pinned summary of the routes LiteLLM registers. Regenerated from source. */
export interface RouteManifest {
  /** The LiteLLM version/ref the manifest was generated from (e.g. `"v1.87.0"`). */
  readonly litellmVersion: string;
  /** Normalized `"METHOD /path"` strings for REST routes. */
  readonly rest: readonly string[];
  /**
   * Normalized `"METHOD /path"` strings for WebSocket handshake routes. The
   * realtime socket (`/v1/responses`, `/v1/realtime`) is reachable with a
   * plain `GET`, so a REST request to one is still drift.
   */
  readonly websocket: readonly string[];
}

/** A single `transport.request`/`stream`/`fetchRaw` call site found in the SDK. */
export interface SdkRoute {
  readonly method: string;
  /** Path exactly as written in the source (may contain `${...}` templates). */
  readonly path: string;
  /** Normalized `"METHOD /path"` used for comparison. */
  readonly key: string;
  /** Source file (relative to `src/api/`) the call site lives in. */
  readonly file: string;
}

/** A route the SDK calls that LiteLLM does not register. */
export interface DriftProblem {
  readonly method: string;
  readonly path: string;
  readonly file: string;
  /** `"missing"`: no such route. `"websocket-only"`: path exists only as a WebSocket. */
  readonly reason: "missing" | "websocket-only";
}

/**
 * Normalize a path for comparison: drop any query string, collapse both SDK
 * `${...}` templates and route `{param}` placeholders (including FastAPI
 * `{id:path}` converters) to `{}`, and strip a trailing slash. So
 * `/v1/files/${encodeURIComponent(id)}` and `/v1/files/{file_id}` both become
 * `/v1/files/{}`.
 */
export const normalizePath = (path: string): string => {
  let s = path.split("?")[0] ?? "";
  s = s.replace(/\$\{[^}]*\}/g, "{}");
  s = s.replace(/\{[^}]*\}/g, "{}");
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s;
};

const REQUEST_RE = /method:\s*"(GET|POST|PUT|PATCH|DELETE)"\s*,\s*path:\s*(?:"([^"]+)"|`([^`]+)`)/g;

/**
 * Extract every `{ method, path }` request descriptor from the SDK's api
 * modules. Relies on the project convention that `method` immediately
 * precedes `path` in each `transport.request`/`stream`/`fetchRaw` options
 * object. Test files are skipped.
 */
export const extractSdkRoutes = async (apiDir: string): Promise<SdkRoute[]> => {
  const routes: SdkRoute[] = [];
  const walk = async (dir: string): Promise<void> => {
    for await (const entry of Deno.readDir(dir)) {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory) {
        await walk(full);
      } else if (entry.name.endsWith(".ts") && !entry.name.endsWith("_test.ts")) {
        const text = await Deno.readTextFile(full);
        REQUEST_RE.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = REQUEST_RE.exec(text)) !== null) {
          const method = match[1];
          const path = match[2] ?? match[3];
          if (method === undefined || path === undefined) continue;
          routes.push({
            method,
            path,
            key: `${method} ${normalizePath(path)}`,
            file: full.slice(full.indexOf("/src/api/") + "/src/api/".length),
          });
        }
      }
    }
  };
  await walk(apiDir);
  return routes;
};

/**
 * Compare SDK routes against the manifest. Returns one problem per distinct
 * drifted route (deduplicated by normalized key). `allowlist` holds normalized
 * keys for routes the manifest cannot represent.
 */
export const diffRoutes = (
  sdkRoutes: readonly SdkRoute[],
  manifest: RouteManifest,
  allowlist: ReadonlySet<string>,
): DriftProblem[] => {
  const rest = new Set(manifest.rest);
  const websocket = new Set(manifest.websocket);
  const problems: DriftProblem[] = [];
  const seen = new Set<string>();
  for (const route of sdkRoutes) {
    if (rest.has(route.key) || allowlist.has(route.key)) continue;
    if (seen.has(route.key)) continue;
    seen.add(route.key);
    problems.push({
      method: route.method,
      path: route.path,
      file: route.file,
      reason: websocket.has(route.key) ? "websocket-only" : "missing",
    });
  }
  return problems;
};
