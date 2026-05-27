import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// The passthrough namespaces forward to upstream providers under reserved
// prefixes (e.g. `/anthropic/*` -> Anthropic API). Without provider
// credentials on the proxy, requests reach the upstream and 401 there;
// that confirms the SDK's path-joining and routing work end-to-end.

interface UnknownObject {
  readonly [k: string]: unknown;
}

e2eTest("anthropic passthrough forwards to Anthropic via /anthropic prefix", async ({ client }) => {
  const result = await client.anthropic.request<UnknownObject>({
    method: "GET",
    path: "/v1/models",
  });
  // Without ANTHROPIC_API_KEY the proxy still routes the request to
  // Anthropic, which 401s. That's the desired smoke outcome.
  if (result.ok) {
    assert(typeof result.value === "object" && result.value !== null);
    return;
  }
  // The proxy maps upstream 401/403 to `kind: "auth"`; other upstream
  // errors come back as `kind: "http"`. Accept either.
  assert(
    result.error.kind === "http" || result.error.kind === "auth",
    `unexpected error kind: ${result.error.kind}`,
  );
});

e2eTest("passthrough handles a leading slash on the supplied path", async ({ client }) => {
  // `/v1/models` vs `v1/models` should resolve identically.
  const a = await client.anthropic.request<UnknownObject>({
    method: "GET",
    path: "/v1/models",
  });
  const b = await client.anthropic.request<UnknownObject>({
    method: "GET",
    path: "v1/models",
  });

  // Both should have the same shape (both ok, or both errored at the
  // upstream layer with the same status).
  if (a.ok && b.ok) return;
  if (!a.ok && !b.ok) {
    assertStrictEquals(a.error.kind, b.error.kind);
    return;
  }
  throw new Error(
    `mismatched outcomes for leading-slash vs no-slash: a=${JSON.stringify(a)} b=${
      JSON.stringify(b)
    }`,
  );
});

e2eTest("passthrough fetchRaw returns a Response for binary endpoints", async ({ client }) => {
  const result = await client.anthropic.fetchRaw({
    method: "GET",
    path: "/v1/models",
  });
  if (!result.ok) {
    // 401/403 surface as `kind: "auth"`; other upstream errors as `"http"`.
    assert(
      result.error.kind === "http" || result.error.kind === "auth",
      `unexpected error kind: ${result.error.kind}`,
    );
    return;
  }
  assert(result.value instanceof Response, "expected a Response");
  // Drain so the runtime doesn't flag a leak.
  await result.value.body?.cancel();
});
