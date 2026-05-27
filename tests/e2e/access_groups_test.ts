import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.accessGroups CRUD round-trip", async ({ client }) => {
  const name = `e2e-ag-${Date.now()}`;

  const created = await client.accessGroups.create({
    access_group_name: name,
    description: "e2e throwaway",
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);
  const id = created.value.access_group_id;

  try {
    // Get round-trips the name.
    const got = await client.accessGroups.get(id);
    assert(got.ok, `get failed: ${JSON.stringify(got)}`);
    assertStrictEquals(got.value.access_group_name, name);

    // List contains the new group.
    const listed = await client.accessGroups.list();
    assert(listed.ok, `list failed: ${JSON.stringify(listed)}`);
    assert(
      listed.value.some((g) => g.access_group_id === id),
      "access group missing from list",
    );

    // Update the description in place.
    const updated = await client.accessGroups.update(id, { description: "e2e updated" });
    assert(updated.ok, `update failed: ${JSON.stringify(updated)}`);
    assertStrictEquals(updated.value.description, "e2e updated");
  } finally {
    const deleted = await client.accessGroups.delete(id);
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
  }
});
