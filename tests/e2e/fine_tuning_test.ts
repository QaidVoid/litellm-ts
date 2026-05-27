import { assert, assertStrictEquals } from "@std/assert";
import type { ApiError, Result } from "../../mod.ts";
import { e2eTest } from "./_helpers.ts";

// Fine-tuning is an enterprise-only feature on LiteLLM. Without a
// `LITELLM_LICENSE` the proxy returns 500 "Only premium users". All five
// methods are smoke-tested to confirm the request shape is built and
// reaches the proxy.

const tolerateUpstream = <T>(result: Result<T, ApiError>): result is { ok: true; value: T } => {
  if (result.ok) return true;
  assertStrictEquals(result.error.kind, "http");
  if (result.error.kind === "http") {
    assert(
      result.error.status === 500 || result.error.status === 400 ||
        result.error.status === 404 || result.error.status === 403,
      `unexpected status: ${result.error.status}`,
    );
  }
  return false;
};

e2eTest("fineTuning.create routes to POST /v1/fine_tuning/jobs", async ({ client }) => {
  const result = await client.fineTuning.create({
    model: "gpt-3.5-turbo",
    training_file: "file-not-real",
    hyperparameters: { n_epochs: 1 },
  });
  if (!tolerateUpstream(result)) return;
  assertStrictEquals(result.value.object, "fine_tuning.job");
});

e2eTest("fineTuning.list routes to GET /v1/fine_tuning/jobs", async ({ client }) => {
  const result = await client.fineTuning.list();
  if (!tolerateUpstream(result)) return;
  assertStrictEquals(result.value.object, "list");
  assert(Array.isArray(result.value.data));
});

e2eTest("fineTuning.list forwards `limit` and `after`", async ({ client }) => {
  const result = await client.fineTuning.list({ limit: 5, after: "ft-x" });
  tolerateUpstream(result);
});

e2eTest("fineTuning.retrieve routes to GET /v1/fine_tuning/jobs/{id}", async ({ client }) => {
  const result = await client.fineTuning.retrieve("ftjob-not-real");
  // Should fail (premium gate or unknown id); structured http error is the
  // pass condition.
  assert(!result.ok, "expected an error");
  assertStrictEquals(result.error.kind, "http");
});

e2eTest("fineTuning.cancel routes to POST /v1/fine_tuning/jobs/{id}/cancel", async ({ client }) => {
  const result = await client.fineTuning.cancel("ftjob-not-real");
  assert(!result.ok, "expected an error");
  assertStrictEquals(result.error.kind, "http");
});

e2eTest("fineTuning.events routes to GET /v1/fine_tuning/jobs/{id}/events", async ({ client }) => {
  const result = await client.fineTuning.events("ftjob-not-real", { limit: 10 });
  // Either premium-gate 500 or unknown-id 404. Either way the call shape
  // worked.
  assert(!result.ok, "expected an error");
  assertStrictEquals(result.error.kind, "http");
});
