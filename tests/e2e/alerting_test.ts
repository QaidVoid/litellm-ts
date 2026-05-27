import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.alerting.settings returns the configurable alerting fields", async ({ client }) => {
  const result = await client.alerting.settings();
  assert(result.ok, `settings failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value), "expected an array of fields");
  // Every entry must at least carry a field_name + field_type + description.
  for (const f of result.value) {
    assert(typeof f.field_name === "string" && f.field_name.length > 0);
    assert(typeof f.field_type === "string");
    assert(typeof f.field_description === "string");
  }
});
