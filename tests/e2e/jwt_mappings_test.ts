import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.jwtMappings CRUD round-trip", async ({ client }) => {
  // Mint a throwaway key to map to.
  const keyResult = await client.keys.generate({
    key_alias: `e2e-jwt-key-${Date.now()}`,
    duration: "60s",
  });
  assert(keyResult.ok, `key generate failed: ${JSON.stringify(keyResult)}`);
  const keyValue = keyResult.value.key;

  const claimValue = `e2e-claim-${Date.now()}`;
  const created = await client.jwtMappings.create({
    jwt_claim_name: "sub",
    jwt_claim_value: claimValue,
    key: keyValue,
    description: "e2e throwaway",
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);
  const mappingId = created.value.id;

  try {
    // Info round-trips the claim value.
    const info = await client.jwtMappings.info(mappingId);
    assert(info.ok, `info failed: ${JSON.stringify(info)}`);
    assertStrictEquals(info.value.jwt_claim_value, claimValue);

    // List contains the new mapping.
    const listed = await client.jwtMappings.list();
    assert(listed.ok, `list failed: ${JSON.stringify(listed)}`);
    assert(
      listed.value.mappings.some((m) => m.id === mappingId),
      "mapping missing from list",
    );

    // Update toggles the description.
    const updated = await client.jwtMappings.update({
      id: mappingId,
      description: "e2e updated",
    });
    assert(updated.ok, `update failed: ${JSON.stringify(updated)}`);
    assertStrictEquals(updated.value.description, "e2e updated");
  } finally {
    const deleted = await client.jwtMappings.delete({ id: mappingId });
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
    await client.keys.delete({ keys: [keyValue] });
  }
});
