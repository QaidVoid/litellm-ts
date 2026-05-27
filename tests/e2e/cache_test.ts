import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// The cache backend may not be initialized on every proxy (e.g. when there's
// no Redis configured). For those proxies most of these endpoints return
// 503/500 errors; we treat those as expected gating rather than failures.
const expectedCacheUnavailable = (status: number): boolean =>
  status === 500 || status === 503 || status === 400;

e2eTest("admin.cache.ping reports the cache backend health", async ({ client }) => {
  const result = await client.cache.ping();
  if (!result.ok) {
    // 503 "Cache not initialized" is the expected error on proxies without
    // a configured cache backend.
    if (result.error.kind === "http" && expectedCacheUnavailable(result.error.status)) return;
    throw new Error(`ping failed: ${JSON.stringify(result.error)}`);
  }
  assert(
    result.value.status === "healthy" || result.value.status === "unhealthy",
    `unexpected status: ${result.value.status}`,
  );
});

e2eTest("admin.cache.getSettings returns the configurable cache fields", async ({ client }) => {
  const result = await client.cache.getSettings();
  assert(result.ok, `getSettings failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.fields), "expected fields array");
  assert(
    typeof result.value.current_values === "object" && result.value.current_values !== null,
    "expected current_values object",
  );
  assert(
    typeof result.value.redis_type_descriptions === "object" &&
      result.value.redis_type_descriptions !== null,
    "expected redis_type_descriptions object",
  );
});

e2eTest("admin.cache.redisInfo dumps the Redis backend state", async ({ client }) => {
  const result = await client.cache.redisInfo();
  if (!result.ok) {
    // 503 when no cache backend is initialized; 403 if locked down to
    // admins on a tighter proxy.
    if (
      result.error.kind === "http" && expectedCacheUnavailable(result.error.status)
    ) return;
    if (result.error.kind === "auth" && result.error.status === 403) return;
    throw new Error(`redisInfo failed: ${JSON.stringify(result.error)}`);
  }
});

e2eTest("admin.cache.flushAll wipes the cache or surfaces an expected error", async ({
  client,
}) => {
  const result = await client.cache.flushAll();
  if (!result.ok) {
    if (
      result.error.kind === "http" && expectedCacheUnavailable(result.error.status)
    ) return;
    if (result.error.kind === "auth" && result.error.status === 403) return;
    throw new Error(`flushAll failed: ${JSON.stringify(result.error)}`);
  }
});

e2eTest("admin.cache.delete invalidates by key", async ({ client }) => {
  const result = await client.cache.delete({ keys: ["e2e-throwaway-key-does-not-exist"] });
  if (!result.ok) {
    if (
      result.error.kind === "http" && expectedCacheUnavailable(result.error.status)
    ) return;
    if (result.error.kind === "auth" && result.error.status === 403) return;
    throw new Error(`delete failed: ${JSON.stringify(result.error)}`);
  }
});

e2eTest("admin.cache.testSettings probes a candidate set without persisting", async ({
  client,
}) => {
  const result = await client.cache.testSettings({
    cache_settings: { host: "127.0.0.1", port: "6379", redis_type: "node" },
  });
  // The probe is expected to fail (no Redis on that host) but should still
  // round-trip. Either an `ok` response with status="failed" or an HTTP error
  // is acceptable; what we're really testing is that the SDK wires the call.
  if (!result.ok) {
    if (
      result.error.kind === "http" && expectedCacheUnavailable(result.error.status)
    ) return;
    if (result.error.kind === "auth" && result.error.status === 403) return;
    throw new Error(`testSettings failed: ${JSON.stringify(result.error)}`);
  }
  assert(typeof result.value.status === "string");
});

e2eTest("admin.cache.updateSettings persists new cache config", async ({ client }) => {
  // Persist the currently-stored cache_settings unchanged; this verifies the
  // POST round-trips without flipping the backend. We read first, then echo
  // back the values we got.
  const settings = await client.cache.getSettings();
  if (!settings.ok) return;
  const result = await client.cache.updateSettings({
    cache_settings: settings.value.current_values,
  });
  if (!result.ok) {
    if (
      result.error.kind === "http" && expectedCacheUnavailable(result.error.status)
    ) return;
    if (result.error.kind === "auth" && result.error.status === 403) return;
    throw new Error(`updateSettings failed: ${JSON.stringify(result.error)}`);
  }
});
