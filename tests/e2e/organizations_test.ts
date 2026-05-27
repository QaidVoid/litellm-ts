import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.organizations CRUD round-trip", async ({ client }) => {
  const alias = `e2e-org-${Date.now()}`;

  const created = await client.organizations.create({
    organization_alias: alias,
    max_budget: 5.0,
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);
  const orgId = created.value.organization_id;
  assert(typeof orgId === "string" && orgId.length > 0, "expected organization_id");

  try {
    // Info round-trips the alias.
    const info = await client.organizations.info(orgId);
    assert(info.ok, `info failed: ${JSON.stringify(info)}`);
    assertStrictEquals(info.value.organization_alias, alias);

    // Update lifts the budget ceiling.
    const updated = await client.organizations.update({
      organization_id: orgId,
      max_budget: 10.0,
    });
    assert(updated.ok, `update failed: ${JSON.stringify(updated)}`);

    // List includes the new org.
    const listed = await client.organizations.list();
    assert(listed.ok);
    assert(
      listed.value.some((o) => o.organization_id === orgId),
      "org missing from list",
    );
  } finally {
    const deleted = await client.organizations.delete({ organization_ids: [orgId] });
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
  }
});
