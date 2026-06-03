/**
 * Fail if the SDK calls a route LiteLLM does not register.
 *
 *   deno task check:routes
 *
 * Compares every `transport.request` call site against the pinned route
 * manifest (`litellm-routes.json`). Offline and deterministic; regenerate the
 * manifest with `deno task snapshot:routes` when bumping LiteLLM versions.
 *
 * This is the guard that catches `responses.list` (a request to the realtime
 * WebSocket path) and `fineTuning.events` (a route LiteLLM never serves)
 * without a manual audit.
 */

import { diffRoutes, errOut, extractSdkRoutes, out, type RouteManifest } from "./_routes.ts";

/**
 * Routes the SDK calls that the manifest cannot represent. Normalized
 * `"METHOD /path"` strings; keep each one justified. Empty today because the
 * source-based manifest captures hidden and mounted routes; add an entry only
 * for a route that genuinely cannot be derived from source.
 */
const ROUTE_ALLOWLIST: ReadonlySet<string> = new Set([]);

/**
 * If extraction returns far fewer routes than expected the regex has likely
 * drifted from the source, which would make every check pass vacuously.
 */
const MIN_EXPECTED_ROUTES = 200;

const manifestUrl = new URL("./litellm-routes.json", import.meta.url);
const manifest = JSON.parse(await Deno.readTextFile(manifestUrl)) as RouteManifest;

const apiDir = new URL("../src/api", import.meta.url).pathname;
const sdkRoutes = await extractSdkRoutes(apiDir);

if (sdkRoutes.length < MIN_EXPECTED_ROUTES) {
  errOut(
    `route extraction found only ${sdkRoutes.length} call sites ` +
      `(expected >= ${MIN_EXPECTED_ROUTES}); the extractor is probably broken.`,
  );
  Deno.exit(2);
}

const problems = diffRoutes(sdkRoutes, manifest, ROUTE_ALLOWLIST);

if (problems.length === 0) {
  out(
    `ok: ${sdkRoutes.length} SDK request sites all resolve against ` +
      `litellm ${manifest.litellmVersion}.`,
  );
  Deno.exit(0);
}

errOut(
  `drift against litellm ${manifest.litellmVersion}: ` +
    `${problems.length} route(s) LiteLLM does not register\n`,
);
for (const p of problems.sort((a, b) => a.path.localeCompare(b.path))) {
  const note = p.reason === "websocket-only"
    ? "exists only as a WebSocket handshake, not a REST route"
    : "no such route";
  errOut(`  ${p.method.padEnd(6)} ${p.path}\n    in ${p.file}: ${note}`);
}
errOut(
  `\nIf the proxy version changed, run: deno task snapshot:routes. ` +
    `If a route is real but cannot be derived from source, add it to ` +
    `ROUTE_ALLOWLIST in scripts/check-routes.ts.`,
);
Deno.exit(1);
