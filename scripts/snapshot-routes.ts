/**
 * Regenerate `scripts/litellm-routes.json` from the LiteLLM source tree.
 *
 *   LITELLM_SRC=/path/to/litellm LITELLM_VERSION=v1.87.0 deno task snapshot:routes
 *
 * `LITELLM_SRC` must point at a LiteLLM checkout at the version you want to
 * pin (a `git worktree` at the tag works well). The source is used rather than
 * a running proxy because neither `openapi.json` (omits ~100
 * `include_in_schema=False` routes) nor `/routes` (omits mounted sub-apps like
 * MCP) lists every served route, while the source registers all of them.
 *
 * Covers: `@router`/`@app` HTTP decorators (multi-line, with `APIRouter(prefix=)`),
 * `@router.websocket`, the `enterprise/` package, and the container-file
 * endpoints registered dynamically from `litellm/containers/endpoints.json`.
 */

import { errOut, normalizePath, out, type RouteManifest } from "./_routes.ts";

const HTTP_DECORATOR = /@(\w+)\.(get|post|put|patch|delete)\(/g;
const WS_DECORATOR = /@(\w+)\.websocket\(\s*"([^"]+)"/g;
const ROUTER_PREFIX = /(\w+)\s*=\s*APIRouter\(([^)]*)\)/gs;
const FIRST_STRING = /"([^"]*)"/;

const src = Deno.env.get("LITELLM_SRC");
const version = Deno.env.get("LITELLM_VERSION") ?? "v1.87.0";
if (src === undefined || src.length === 0) {
  errOut("LITELLM_SRC is required: point it at a LiteLLM checkout at the version to pin.");
  Deno.exit(1);
}

const rest = new Set<string>();
const websocket = new Set<string>();

const collectFile = async (file: string): Promise<void> => {
  const text = await Deno.readTextFile(file);

  // Map each router variable to its APIRouter(prefix=...) (default "").
  const prefixes = new Map<string, string>();
  for (const m of text.matchAll(ROUTER_PREFIX)) {
    const varName = m[1];
    if (varName === undefined) continue;
    const prefix = (m[2] ?? "").match(/prefix\s*=\s*"([^"]*)"/);
    prefixes.set(varName, prefix?.[1] ?? "");
  }

  for (const m of text.matchAll(HTTP_DECORATOR)) {
    const varName = m[1];
    const method = m[2];
    if (varName === undefined || method === undefined || m.index === undefined) continue;
    const start = m.index + m[0].length;
    const path = text.slice(start, start + 300).match(FIRST_STRING);
    const literal = path?.[1];
    if (literal !== undefined && literal.startsWith("/")) {
      rest.add(`${method.toUpperCase()} ${normalizePath((prefixes.get(varName) ?? "") + literal)}`);
    }
  }

  for (const m of text.matchAll(WS_DECORATOR)) {
    const varName = m[1];
    const literal = m[2];
    if (varName === undefined || literal === undefined || !literal.startsWith("/")) continue;
    websocket.add(`GET ${normalizePath((prefixes.get(varName) ?? "") + literal)}`);
  }
};

const walk = async (dir: string): Promise<void> => {
  let entries: Deno.DirEntry[];
  try {
    entries = [...await Array.fromAsync(Deno.readDir(dir))];
  } catch {
    return; // directory may not exist (e.g. no enterprise/ package)
  }
  for (const entry of entries) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory) {
      if (full.includes("/_experimental/out")) continue; // compiled UI bundles
      await walk(full);
    } else if (entry.name.endsWith(".py")) {
      await collectFile(full);
    }
  }
};

await walk(`${src}/litellm`);
await walk(`${src}/enterprise`);

// Container-file routes are registered programmatically from a JSON config,
// under both `/v1{path}` and `{path}` (see container_endpoints/handler_factory.py).
try {
  const config = JSON.parse(
    await Deno.readTextFile(`${src}/litellm/containers/endpoints.json`),
  ) as { endpoints?: ReadonlyArray<{ path: string; method: string }> };
  for (const ep of config.endpoints ?? []) {
    const method = ep.method.toUpperCase();
    rest.add(`${method} ${normalizePath(`/v1${ep.path}`)}`);
    rest.add(`${method} ${normalizePath(ep.path)}`);
  }
} catch {
  errOut("warning: could not read litellm/containers/endpoints.json; container routes skipped");
}

if (rest.size < 200) {
  errOut(`only ${rest.size} routes found in ${src}; is LITELLM_SRC a LiteLLM checkout?`);
  Deno.exit(1);
}

const manifest: RouteManifest = {
  litellmVersion: version,
  rest: [...rest].sort(),
  websocket: [...websocket].sort(),
};

const target = new URL("./litellm-routes.json", import.meta.url);
await Deno.writeTextFile(target, `${JSON.stringify(manifest, null, 2)}\n`);
out(
  `wrote ${manifest.rest.length} REST + ${manifest.websocket.length} websocket routes ` +
    `for litellm ${version} -> ${target.pathname}`,
);
