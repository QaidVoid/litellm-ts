import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.credentials CRUD round-trip", async ({ client }) => {
  const name = `e2e-cred-${Date.now()}`;

  const created = await client.credentials.create({
    credential_name: name,
    credential_info: { purpose: "e2e" },
    credential_values: { api_key: "sk-fake-e2e" },
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);

  try {
    // List eventually contains the credential.
    const listed = await client.credentials.list();
    assert(listed.ok, `list failed: ${JSON.stringify(listed)}`);
    assert(
      listed.value.credentials.some((c) => c.credential_name === name),
      "credential missing from list",
    );

    // By-name lookup masks the value but returns the metadata.
    const byName = await client.credentials.getByName(name);
    assert(byName.ok, `getByName failed: ${JSON.stringify(byName)}`);
    assertStrictEquals(byName.value.credential_name, name);

    // Update replaces the metadata. The proxy requires `credential_values`
    // even when re-passing the existing value, so include it.
    const updated = await client.credentials.update(name, {
      credential_name: name,
      credential_info: { purpose: "e2e-updated" },
      credential_values: { api_key: "sk-fake-e2e" },
    });
    assert(updated.ok, `update failed: ${JSON.stringify(updated)}`);
  } finally {
    const deleted = await client.credentials.delete(name);
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
  }
});
