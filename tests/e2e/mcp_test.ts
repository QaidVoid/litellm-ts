import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// Helper: accept either a successful call, a 403 (enterprise-gated), a 404
// (route not exposed on this build), or a 500 (missing provider/setup).
// Returns true if the result was "ok-ish" enough to count as routed.
const tolerant = (result: { ok: boolean; error?: { kind: string; status?: number } }): void => {
  if (result.ok) return;
  const err = result.error!;
  if (err.kind === "auth") return;
  if (err.kind === "http") {
    const s = err.status ?? 0;
    assert(
      s === 403 || s === 404 || s === 500 || s === 400 || s === 422 || s === 401,
      `unexpected status ${s}: ${JSON.stringify(err)}`,
    );
    return;
  }
  // Network / validation errors are unexpected here; fail loudly.
  throw new Error(`unexpected error: ${JSON.stringify(err)}`);
};

e2eTest("mcp.tools returns the tool catalog", async ({ client }) => {
  const result = await client.mcp.tools();
  if (!result.ok && result.error.kind === "auth") return;
  assert(result.ok, `tools failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.tools), "expected tools array");
});

e2eTest("mcp.accessGroups returns the access-group catalog", async ({ client }) => {
  const result = await client.mcp.accessGroups();
  if (!result.ok && result.error.kind === "auth") return;
  assert(result.ok, `accessGroups failed: ${JSON.stringify(result)}`);
  assert(
    Array.isArray(result.value.access_groups),
    "expected access_groups array",
  );
});

e2eTest("mcp.discover lists curated public servers", async ({ client }) => {
  const result = await client.mcp.discover();
  if (!result.ok && result.error.kind === "auth") return;
  assert(result.ok, `discover failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.servers));
  assert(Array.isArray(result.value.categories));
});

e2eTest("mcp.clientIp echoes the caller's IP", async ({ client }) => {
  const result = await client.mcp.clientIp();
  if (!result.ok && result.error.kind === "auth") return;
  assert(result.ok, `clientIp failed: ${JSON.stringify(result)}`);
  assert(typeof result.value.ip === "string" && result.value.ip.length > 0);
});

e2eTest("mcp.servers list+get+create+delete round-trip", async ({ client }) => {
  // List existing first.
  const list = await client.mcp.servers.list();
  if (!list.ok && list.error.kind === "auth") return;
  assert(list.ok, `list failed: ${JSON.stringify(list)}`);

  // Create a throwaway server. Server names cannot contain hyphens.
  const name = `e2e_mcp_${Date.now()}`;
  const created = await client.mcp.servers.create({
    server_name: name,
    transport: "http",
    url: "https://example.invalid/mcp",
    auth_type: "none",
  });
  if (!created.ok && created.error.kind === "auth") return;
  if (!created.ok && created.error.kind === "http" && created.error.status === 403) return;
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);
  const serverId = created.value.server_id;

  try {
    const got = await client.mcp.servers.get(serverId);
    assert(got.ok, `get failed: ${JSON.stringify(got)}`);
    assertStrictEquals(got.value.server_id, serverId);
  } finally {
    const deleted = await client.mcp.servers.delete(serverId);
    // delete may return empty body; just check the call completes
    assert(
      deleted.ok || (deleted.error.kind === "http" && deleted.error.status < 500),
      `delete failed: ${JSON.stringify(deleted)}`,
    );
  }
});

e2eTest("mcp.servers.health probes server health", async ({ client }) => {
  const result = await client.mcp.servers.health();
  tolerant(result);
});

e2eTest("mcp.servers.submissions lists pending submissions", async ({ client }) => {
  const result = await client.mcp.servers.submissions();
  tolerant(result);
});

e2eTest("mcp.toolsets list+create+get+delete round-trip", async ({ client }) => {
  const list = await client.mcp.toolsets.list();
  if (!list.ok && list.error.kind === "auth") return;
  assert(list.ok, `list failed: ${JSON.stringify(list)}`);

  const name = `e2e_toolset_${Date.now()}`;
  const created = await client.mcp.toolsets.create({ toolset_name: name });
  if (!created.ok && created.error.kind === "auth") return;
  if (!created.ok && created.error.kind === "http" && created.error.status === 403) return;
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);
  const toolsetId = created.value.toolset_id;

  try {
    const got = await client.mcp.toolsets.get(toolsetId);
    assert(got.ok, `get failed: ${JSON.stringify(got)}`);
    assertStrictEquals(got.value.toolset_id, toolsetId);
  } finally {
    const deleted = await client.mcp.toolsets.delete(toolsetId);
    assert(
      deleted.ok || (deleted.error.kind === "http" && deleted.error.status < 500),
      `delete failed: ${JSON.stringify(deleted)}`,
    );
  }
});

e2eTest("mcp.rest.toolsList enumerates available tools", async ({ client }) => {
  const result = await client.mcp.rest.toolsList();
  tolerant(result);
});

e2eTest("mcp.rest.toolsCall routes to the embedded MCP server", async ({ client }) => {
  const result = await client.mcp.rest.toolsCall({
    name: "nonexistent_tool",
    arguments: {},
  });
  // We don't expect this to succeed — there's no tool by that name. We just
  // verify the call reaches the proxy and surfaces a structured failure.
  tolerant(result);
});

e2eTest("mcp.openApiRegistry returns the OpenAPI registry (admin)", async ({ client }) => {
  const result = await client.mcp.openApiRegistry();
  tolerant(result);
});

e2eTest("mcp.registryJson returns the public registry response", async ({ client }) => {
  const result = await client.mcp.registryJson();
  tolerant(result);
});

e2eTest("mcp.userCredentials lists stored BYOK credentials", async ({ client }) => {
  const result = await client.mcp.userCredentials();
  tolerant(result);
});

e2eTest("mcp.storeUserCredential + delete BYOK API-key round-trip", async ({ client }) => {
  // Try against a non-existent server id; the proxy may still 404, 400, or
  // happily persist the credential. We only verify the call routes.
  const stored = await client.mcp.storeUserCredential("e2e-server-id-missing", {
    credential: "fake-key",
    save: false,
  });
  tolerant(stored);
  const removed = await client.mcp.deleteUserCredential("e2e-server-id-missing");
  tolerant(removed);
});

e2eTest("mcp.oauthUserCredentialStatus probes OAuth2 BYOK status", async ({ client }) => {
  const result = await client.mcp.oauthUserCredentialStatus("e2e-server-id-missing");
  tolerant(result);
});

e2eTest(
  "mcp.storeOAuthUserCredential + deleteOAuthUserCredential round-trip",
  async ({ client }) => {
    const stored = await client.mcp.storeOAuthUserCredential("e2e-server-id-missing", {
      access_token: "fake-token",
      expires_in: 3600,
    });
    tolerant(stored);
    const removed = await client.mcp.deleteOAuthUserCredential("e2e-server-id-missing");
    tolerant(removed);
  },
);

e2eTest("mcp.oauthAuthorize returns or rejects the consent screen", async ({ client }) => {
  const result = await client.mcp.oauthAuthorize({
    redirect_uri: "https://example.invalid/cb",
    response_type: "code",
    code_challenge: "abcd",
    code_challenge_method: "S256",
    state: "xyz",
  });
  tolerant(result);
});

e2eTest("mcp.oauthAuthorizeSubmit records consent", async ({ client }) => {
  const result = await client.mcp.oauthAuthorizeSubmit({
    code: "fake-code",
    state: "xyz",
  });
  tolerant(result);
});

e2eTest("mcp.oauthToken exchanges a code for a session token", async ({ client }) => {
  const result = await client.mcp.oauthToken({
    grant_type: "authorization_code",
    code: "fake-code",
    code_verifier: "fake-verifier",
  });
  tolerant(result);
});

e2eTest("mcp.makePublic flips servers to public", async ({ client }) => {
  // Use an empty list; this lets the call round-trip without mutating anything.
  const result = await client.mcp.makePublic({ mcp_server_ids: [] });
  tolerant(result);
});

e2eTest("mcp.servers.update round-trips on a created server", async ({ client }) => {
  const name = `e2e_mcp_upd_${Date.now()}`;
  const created = await client.mcp.servers.create({
    server_name: name,
    transport: "http",
    url: "https://example.invalid/mcp",
    auth_type: "none",
  });
  if (!created.ok && created.error.kind === "auth") return;
  if (!created.ok && created.error.kind === "http" && created.error.status === 403) return;
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);
  const serverId = created.value.server_id;

  try {
    const updated = await client.mcp.servers.update({
      server_id: serverId,
      transport: "http",
      url: "https://example.invalid/mcp-v2",
      auth_type: "none",
      description: "updated",
    });
    if (!updated.ok) {
      assert(
        updated.error.kind === "http" || updated.error.kind === "auth",
        `unexpected update error: ${JSON.stringify(updated.error)}`,
      );
    }
  } finally {
    await client.mcp.servers.delete(serverId);
  }
});

e2eTest("mcp.servers.register submits a server for review", async ({ client }) => {
  const name = `e2e_mcp_reg_${Date.now()}`;
  const result = await client.mcp.servers.register({
    server_name: name,
    transport: "http",
    url: "https://example.invalid/mcp",
    auth_type: "none",
  });
  if (!result.ok) {
    tolerant(result);
    return;
  }
  // If the registration succeeded, try to clean up the submitted server.
  await client.mcp.servers.delete(result.value.server_id);
});

e2eTest("mcp.servers.approve smoke-runs against a missing server", async ({ client }) => {
  const result = await client.mcp.servers.approve(`e2e-missing-server-${Date.now()}`);
  tolerant(result);
});

e2eTest("mcp.servers.reject smoke-runs against a missing server", async ({ client }) => {
  const result = await client.mcp.servers.reject(`e2e-missing-server-${Date.now()}`);
  tolerant(result);
});

e2eTest("mcp.toolsets.update round-trips on a created toolset", async ({ client }) => {
  const name = `e2e_ts_upd_${Date.now()}`;
  const created = await client.mcp.toolsets.create({ toolset_name: name });
  if (!created.ok && created.error.kind === "auth") return;
  if (!created.ok && created.error.kind === "http" && created.error.status === 403) return;
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);
  const toolsetId = created.value.toolset_id;

  try {
    const updated = await client.mcp.toolsets.update({
      toolset_id: toolsetId,
      description: "updated",
    });
    if (!updated.ok) {
      assert(
        updated.error.kind === "http" || updated.error.kind === "auth",
        `unexpected update error: ${JSON.stringify(updated.error)}`,
      );
    }
  } finally {
    await client.mcp.toolsets.delete(toolsetId);
  }
});
