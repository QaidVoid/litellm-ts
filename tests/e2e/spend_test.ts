import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// Spend endpoints are read-only on a freshly-booted proxy with no traffic.
// We verify the routes are wired and respond in the expected shape rather
// than asserting any particular spend rows.

e2eTest("admin.spend.tags returns the tag spend aggregation", async ({ client }) => {
  const result = await client.spend.tags();
  assert(result.ok, `tags failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value));
});

e2eTest("admin.spend.keys returns the per-key spend rollup", async ({ client }) => {
  const result = await client.spend.keys();
  assert(result.ok, `keys failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value));
});

e2eTest("admin.spend.users returns the per-user spend rollup", async ({ client }) => {
  const result = await client.spend.users();
  assert(result.ok, `users failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value));
});

e2eTest("admin.spend.logs returns paginated spend logs", async ({ client }) => {
  const result = await client.spend.logs();
  assert(result.ok, `logs failed: ${JSON.stringify(result)}`);
});
