import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.memory CRUD round-trip", async ({ client }) => {
  const key = `e2e-memory-${Date.now()}`;
  const value = "hello world";

  const created = await client.memory.create({ key, value });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);
  assertStrictEquals(created.value.key, key);
  assertStrictEquals(created.value.value, value);

  try {
    // Get round-trips the row.
    const got = await client.memory.get(key);
    assert(got.ok, `get failed: ${JSON.stringify(got)}`);
    assertStrictEquals(got.value.value, value);

    // List filtered by exact key match contains the row.
    const listed = await client.memory.list({ key });
    assert(listed.ok, `list failed: ${JSON.stringify(listed)}`);
    assert(
      listed.value.memories.some((m) => m.key === key),
      "memory missing from list",
    );

    // Upsert replaces the value.
    const updated = await client.memory.upsert(key, { value: "updated" });
    assert(updated.ok, `upsert failed: ${JSON.stringify(updated)}`);
    assertStrictEquals(updated.value.value, "updated");
  } finally {
    const deleted = await client.memory.delete(key);
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
    assertStrictEquals(deleted.value.deleted, true);
  }
});
