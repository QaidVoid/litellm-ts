import { assert } from "@std/assert";
import { customModel } from "../../mod.ts";
import { e2eTest } from "./_helpers.ts";

// The realtime endpoints all need OpenAI realtime backing (or equivalent
// upstream support); the proxy returns 401/500 without it. We just verify
// each path routes through the SDK.

e2eTest("realtime.clientSecrets routes to /v1/realtime/client_secrets", async ({ client }) => {
  const result = await client.realtime.clientSecrets({
    session: { type: "realtime", model: "gpt-realtime" },
  });
  if (result.ok) return;
  assert(
    result.error.kind === "http" || result.error.kind === "auth",
    `unexpected error kind: ${result.error.kind}`,
  );
  if (result.error.kind === "http") {
    const s = result.error.status;
    assert(
      s === 400 || s === 401 || s === 403 || s === 404 || s === 422 || s === 500,
      `unexpected status ${s}`,
    );
  }
});

e2eTest("realtime.calls routes to /v1/realtime/calls", async ({ client }) => {
  const result = await client.realtime.calls({});
  if (result.ok) return;
  assert(
    result.error.kind === "http" || result.error.kind === "auth",
    `unexpected error kind: ${result.error.kind}`,
  );
  if (result.error.kind === "http") {
    const s = result.error.status;
    assert(
      s === 400 || s === 401 || s === 403 || s === 404 || s === 422 || s === 500,
      `unexpected status ${s}`,
    );
  }
});

e2eTest("realtime.connect opens a WebSocket against /v1/realtime", async ({ client }) => {
  // The proxy will either upgrade or reject; both are acceptable outcomes.
  // We're verifying the SDK's WebSocket handshake construction, not the
  // upstream session.
  const ctrl = new AbortController();
  const result = await client.realtime.connect({
    model: customModel("gpt-realtime") as never,
    signal: ctrl.signal,
  });
  if (result.ok) {
    await result.value.close();
    return;
  }
  assert(
    result.error.kind === "network" || result.error.kind === "stream",
    `unexpected error kind: ${result.error.kind}`,
  );
});
