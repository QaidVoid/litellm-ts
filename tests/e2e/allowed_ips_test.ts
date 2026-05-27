import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.allowedIps.list returns the current allowlist (null when unset)", async ({
  client,
}) => {
  const result = await client.allowedIps.list();
  assert(result.ok, `list failed: ${JSON.stringify(result)}`);
  // `data` is either `null` (filter inactive) or an array of strings.
  const data = result.value.data;
  assert(data === null || Array.isArray(data), `unexpected data shape: ${JSON.stringify(data)}`);
});

// The CRUD round-trip is intentionally not exercised: adding any IP to the
// allowlist immediately activates the filter on the proxy, and the next
// request from a non-listed IP (including the test runner) is rejected with
// 403 -- which would lock the rest of the suite out until an operator clears
// `general_settings.allowed_ips` in the database. The `list` test above is
// enough to verify the SDK wires the read path correctly. The `add` /
// `delete` methods share the same transport code path as every other POST
// endpoint, so the type surface is covered.
