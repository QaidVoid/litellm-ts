import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// Read-only config probes. The config-update endpoints mutate proxy state
// and are skipped here; the corresponding unit tests under `src/` cover
// the request shape.

e2eTest(
  "admin.config.fields.list returns the configurable general-settings catalog",
  async ({ client }) => {
    const result = await client.config.fields.list();
    assert(result.ok, `fields.list failed: ${JSON.stringify(result)}`);
    assert(Array.isArray(result.value));
  },
);

e2eTest("admin.config.costDiscounts.get returns the discount configuration", async ({ client }) => {
  const result = await client.config.costDiscounts.get();
  assert(result.ok, `costDiscounts.get failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.config.costMargins.get returns the margin configuration", async ({ client }) => {
  const result = await client.config.costMargins.get();
  assert(result.ok, `costMargins.get failed: ${JSON.stringify(result)}`);
});
