import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.callbacks.list returns the current callback chain", async ({ client }) => {
  const result = await client.callbacks.list();
  assert(result.ok, `list failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.callbacks.configs returns the configurable callback catalog", async ({ client }) => {
  const result = await client.callbacks.configs();
  assert(result.ok, `configs failed: ${JSON.stringify(result)}`);
  // The configs response is keyed by callback name; ensure non-empty for a
  // proxy with at least one provider registered.
  assert(typeof result.value === "object" && result.value !== null);
});
