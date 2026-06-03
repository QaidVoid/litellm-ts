import { assertEquals } from "@std/assert";
import { diffRoutes, normalizePath, type RouteManifest, type SdkRoute } from "./_routes.ts";

Deno.test("normalizePath collapses SDK templates and route params to {}", () => {
  assertEquals(normalizePath("/v1/files/${encodeURIComponent(id)}"), "/v1/files/{}");
  assertEquals(normalizePath("/v1/files/{file_id}"), "/v1/files/{}");
  assertEquals(
    normalizePath("/v1/fine_tuning/jobs/{fine_tuning_job_id:path}/events"),
    "/v1/fine_tuning/jobs/{}/events",
  );
});

Deno.test("normalizePath drops query strings and a trailing slash", () => {
  assertEquals(normalizePath("/spend/logs?page=1"), "/spend/logs");
  assertEquals(normalizePath("/team/list/"), "/team/list");
  assertEquals(normalizePath("/"), "/");
});

const manifest: RouteManifest = {
  litellmVersion: "test",
  rest: ["POST /v1/chat/completions", "POST /v1/responses", "GET /v1/responses/{}"],
  websocket: ["GET /v1/responses"],
};

const route = (method: string, path: string, file: string): SdkRoute => ({
  method,
  path,
  key: `${method} ${normalizePath(path)}`,
  file,
});

Deno.test("diffRoutes flags a route the proxy does not serve", () => {
  const problems = diffRoutes(
    [route("GET", "/v1/fine_tuning/jobs/${id}/events", "fine_tuning.ts")],
    manifest,
    new Set(),
  );
  assertEquals(problems.length, 1);
  assertEquals(problems[0]?.reason, "missing");
});

Deno.test("diffRoutes flags a request to a WebSocket-only path", () => {
  const problems = diffRoutes([route("GET", "/v1/responses", "responses.ts")], manifest, new Set());
  assertEquals(problems.length, 1);
  assertEquals(problems[0]?.reason, "websocket-only");
});

Deno.test("diffRoutes passes valid routes and respects the allowlist", () => {
  const sdk = [
    route("POST", "/v1/chat/completions", "chat.ts"),
    route("GET", "/v1/responses/${id}", "responses.ts"),
    route("POST", "/hidden/route", "x.ts"),
  ];
  assertEquals(diffRoutes(sdk, manifest, new Set(["POST /hidden/route"])).length, 0);
});

Deno.test("diffRoutes deduplicates a drifted route reported from many call sites", () => {
  const sdk = [
    route("GET", "/nope", "a.ts"),
    route("GET", "/nope", "b.ts"),
  ];
  assertEquals(diffRoutes(sdk, manifest, new Set()).length, 1);
});
