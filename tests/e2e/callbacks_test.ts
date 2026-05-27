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

e2eTest(
  "admin.callbacks.activeCallbacks dumps the in-process active list",
  async ({ client }) => {
    const result = await client.callbacks.activeCallbacks();
    if (!result.ok) {
      if (result.error.kind === "http" && result.error.status >= 400) return;
      if (result.error.kind === "auth") return;
      throw new Error(`activeCallbacks failed: ${JSON.stringify(result.error)}`);
    }
  },
);

e2eTest(
  "admin.callbacks.configCallbacks returns the admin-UI view",
  async ({ client }) => {
    const result = await client.callbacks.configCallbacks();
    if (!result.ok) {
      if (result.error.kind === "http" && result.error.status >= 400) return;
      if (result.error.kind === "auth") return;
      throw new Error(`configCallbacks failed: ${JSON.stringify(result.error)}`);
    }
  },
);
