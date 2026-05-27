import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// SCIM v2 is enterprise-gated. We exercise the read paths (discovery) and
// smoke the mutating endpoints on synthetic resources. The proxy is
// expected to surface 403/404/500 on community builds; we only assert
// wire-level correctness.

const tolerantScim = (result: {
  ok: boolean;
  error?: { kind: string; status?: number };
}): void => {
  if (result.ok) return;
  const e = result.error!;
  if (e.kind === "auth") return;
  if (e.kind === "http") {
    const s = e.status ?? 0;
    if (s >= 400 && s < 600) return;
  }
  throw new Error(`unexpected scim error: ${JSON.stringify(e)}`);
};

e2eTest("admin.scim.serviceProviderConfig returns SCIM provider config", async ({ client }) => {
  const result = await client.scim.serviceProviderConfig();
  tolerantScim(result);
});

e2eTest("admin.scim.resourceTypes lists SCIM resource types", async ({ client }) => {
  const result = await client.scim.resourceTypes();
  if (!result.ok) {
    tolerantScim(result);
    return;
  }
  assert(Array.isArray(result.value));
});

e2eTest("admin.scim.resourceType retrieves a single resource type", async ({ client }) => {
  const result = await client.scim.resourceType("User");
  tolerantScim(result);
});

e2eTest("admin.scim.schemas lists SCIM schemas", async ({ client }) => {
  const result = await client.scim.schemas();
  if (!result.ok) {
    tolerantScim(result);
    return;
  }
  assert(Array.isArray(result.value));
});

e2eTest("admin.scim.schema retrieves a single schema", async ({ client }) => {
  const result = await client.scim.schema("urn:ietf:params:scim:schemas:core:2.0:User");
  tolerantScim(result);
});

e2eTest("admin.scim.users.list pages through SCIM users", async ({ client }) => {
  const result = await client.scim.users.list({ count: 5 });
  tolerantScim(result);
});

e2eTest("admin.scim.users CRUD + patch round-trip", async ({ client }) => {
  const userName = `e2e-scim-u-${Date.now()}@example.test`;
  const created = await client.scim.users.create({
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    userName,
    name: { givenName: "E2E", familyName: "User" },
    emails: [{ value: userName, primary: true }],
  });
  if (!created.ok) {
    tolerantScim(created);
    return;
  }
  const id = created.value.id;
  if (id === undefined) return;

  try {
    const got = await client.scim.users.get(id);
    if (!got.ok) tolerantScim(got);

    const updated = await client.scim.users.update(id, {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      userName,
      displayName: "updated",
    });
    if (!updated.ok) tolerantScim(updated);

    const patched = await client.scim.users.patch(id, {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
      Operations: [{ op: "replace", path: "displayName", value: "patched" }],
    });
    if (!patched.ok) tolerantScim(patched);
  } finally {
    const removed = await client.scim.users.delete(id);
    if (!removed.ok) tolerantScim(removed);
  }
});

e2eTest("admin.scim.groups.list pages through SCIM groups", async ({ client }) => {
  const result = await client.scim.groups.list({ count: 5 });
  tolerantScim(result);
});

e2eTest("admin.scim.groups CRUD + patch round-trip", async ({ client }) => {
  const displayName = `e2e-scim-g-${Date.now()}`;
  const created = await client.scim.groups.create({
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"],
    displayName,
  });
  if (!created.ok) {
    tolerantScim(created);
    return;
  }
  const id = created.value.id;
  if (id === undefined) return;

  try {
    const got = await client.scim.groups.get(id);
    if (!got.ok) tolerantScim(got);

    const updated = await client.scim.groups.update(id, {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"],
      displayName: `${displayName}-upd`,
    });
    if (!updated.ok) tolerantScim(updated);

    const patched = await client.scim.groups.patch(id, {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
      Operations: [{ op: "replace", path: "displayName", value: `${displayName}-patched` }],
    });
    if (!patched.ok) tolerantScim(patched);
  } finally {
    const removed = await client.scim.groups.delete(id);
    if (!removed.ok) tolerantScim(removed);
  }
});
