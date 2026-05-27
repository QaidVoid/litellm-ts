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

e2eTest("bedrock passthrough.request reaches the AWS-shape upstream", async ({ client }) => {
  // Without AWS creds the proxy still routes; upstream surfaces 401/403/500.
  const result = await client.bedrock.request<UnknownObject>({
    method: "GET",
    path: "/model/anthropic.claude-3-sonnet-20240229-v1:0/invoke",
  });
  if (result.ok) {
    assert(typeof result.value === "object" && result.value !== null);
    return;
  }
  assert(
    result.error.kind === "http" || result.error.kind === "auth",
    `unexpected bedrock error: ${result.error.kind}`,
  );
});

e2eTest("bedrock passthrough.stream opens an SSE-style response", async ({ client }) => {
  const result = await client.bedrock.stream({
    method: "POST",
    path: "/model/anthropic.claude-3-sonnet-20240229-v1:0/invoke-with-response-stream",
    body: { prompt: "Reply with one word: x." },
  });
  if (result.ok) {
    // Drain so Deno's leak sanitizer is happy.
    await result.value.cancel();
    return;
  }
  assert(
    result.error.kind === "http" || result.error.kind === "auth",
    `unexpected bedrock stream error: ${result.error.kind}`,
  );
});

e2eTest("bedrock passthrough.fetchRaw exposes the raw Response", async ({ client }) => {
  const result = await client.bedrock.fetchRaw({
    method: "GET",
    path: "/foundation-models",
  });
  if (!result.ok) {
    assert(
      result.error.kind === "http" || result.error.kind === "auth",
      `unexpected bedrock fetchRaw error: ${result.error.kind}`,
    );
    return;
  }
  assert(result.value instanceof Response);
  await result.value.body?.cancel();
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
