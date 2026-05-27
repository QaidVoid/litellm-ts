import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.agents CRUD round-trip", async ({ client }) => {
  const agentName = `e2e-agent-${Date.now()}`;

  const created = await client.agents.create({
    agent_name: agentName,
    agent_card_params: {
      protocolVersion: "0.0.1",
      name: agentName,
      description: "e2e throwaway",
      url: "https://example.test/agent",
      version: "0.0.1",
      capabilities: {},
      defaultInputModes: ["text"],
      defaultOutputModes: ["text"],
      skills: [
        {
          id: "echo",
          name: "echo",
          description: "echoes input",
          tags: ["e2e"],
        },
      ],
    },
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);
  const agentId = created.value.agent_id;

  try {
    // Get round-trips the name.
    const got = await client.agents.get(agentId);
    assert(got.ok, `get failed: ${JSON.stringify(got)}`);
    assertStrictEquals(got.value.agent_name, agentName);

    // List contains the new agent.
    const listed = await client.agents.list();
    assert(listed.ok, `list failed: ${JSON.stringify(listed)}`);
    assert(
      listed.value.some((a) => a.agent_id === agentId),
      "agent missing from list",
    );

    // Patch renames in place.
    const patched = await client.agents.patch(agentId, {
      agent_name: `${agentName}-renamed`,
    });
    assert(patched.ok, `patch failed: ${JSON.stringify(patched)}`);
    assertStrictEquals(patched.value.agent_name, `${agentName}-renamed`);
  } finally {
    const deleted = await client.agents.delete(agentId);
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
  }
});

// Helper: build a throwaway agent for the tests below. Most A2A-side
// endpoints don't need the agent to be reachable, just registered.
const createThrowawayAgent = async (
  client: import("../../mod.ts").Client,
  suffix: string,
): Promise<string> => {
  const name = `e2e-agent-${suffix}-${Date.now()}`;
  const created = await client.agents.create({
    agent_name: name,
    agent_card_params: {
      protocolVersion: "0.0.1",
      name,
      description: "e2e throwaway",
      url: "https://example.test/agent",
      version: "0.0.1",
      capabilities: {},
      defaultInputModes: ["text"],
      defaultOutputModes: ["text"],
      skills: [
        {
          id: "echo",
          name: "echo",
          description: "echoes input",
          tags: ["e2e"],
        },
      ],
    },
  });
  if (!created.ok) {
    throw new Error(`precondition agent create failed: ${JSON.stringify(created)}`);
  }
  return created.value.agent_id;
};

e2eTest("admin.agents.makePublic flags a single agent (tolerant)", async ({ client }) => {
  const agentId = await createThrowawayAgent(client, "mp");
  try {
    const result = await client.agents.makePublic(agentId, { agent_ids: [agentId] });
    // makePublic is admin-gated; tolerate 403 / 404 if the proxy build
    // doesn't expose the public-sharing feature.
    if (!result.ok) {
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected makePublic error: ${JSON.stringify(result.error)}`,
      );
    }
  } finally {
    await client.agents.delete(agentId);
  }
});

e2eTest("admin.agents.makePublicBulk flags a set of agents (tolerant)", async ({ client }) => {
  const agentId = await createThrowawayAgent(client, "mpb");
  try {
    const result = await client.agents.makePublicBulk({ agent_ids: [agentId] });
    if (!result.ok) {
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected makePublicBulk error: ${JSON.stringify(result.error)}`,
      );
    }
  } finally {
    await client.agents.delete(agentId);
  }
});

e2eTest("admin.agents.agentCard fetches the public card (tolerant)", async ({ client }) => {
  const agentId = await createThrowawayAgent(client, "card");
  try {
    const card = await client.agents.agentCard(agentId);
    // The A2A discovery endpoint can return 404 when the agent's not
    // marked public; just confirm the SDK route is wired.
    if (!card.ok) {
      assert(
        card.error.kind === "http" || card.error.kind === "auth",
        `unexpected agentCard error: ${JSON.stringify(card.error)}`,
      );
    }

    const legacy = await client.agents.agentCardLegacy(agentId);
    if (!legacy.ok) {
      assert(
        legacy.error.kind === "http" || legacy.error.kind === "auth",
        `unexpected agentCardLegacy error: ${JSON.stringify(legacy.error)}`,
      );
    }
  } finally {
    await client.agents.delete(agentId);
  }
});

e2eTest(
  "admin.agents.sendMessage round-trips a JSON-RPC envelope (tolerant)",
  async ({ client }) => {
    const agentId = await createThrowawayAgent(client, "msg");
    try {
      const result = await client.agents.sendMessage(agentId, {
        id: "1",
        jsonrpc: "2.0",
        method: "message/send",
        params: {
          message: {
            role: "user",
            parts: [{ kind: "text", text: "hello" }],
            messageId: "m1",
          },
        },
      });
      // The throwaway agent's URL points at example.test, so the proxy
      // can't actually reach it. We only assert the SDK route + envelope
      // are wired; the upstream failure is fine.
      if (!result.ok) {
        assert(
          result.error.kind === "http" || result.error.kind === "auth" ||
            result.error.kind === "network",
          `unexpected sendMessage error: ${JSON.stringify(result.error)}`,
        );
      }
    } finally {
      await client.agents.delete(agentId);
    }
  },
);

e2eTest("admin.agents.invoke posts a generic A2A body (tolerant)", async ({ client }) => {
  const agentId = await createThrowawayAgent(client, "inv");
  try {
    const result = await client.agents.invoke(agentId, {
      jsonrpc: "2.0",
      id: "1",
      method: "message/send",
      params: { message: { role: "user", parts: [{ kind: "text", text: "hi" }] } },
    });
    if (!result.ok) {
      assert(
        result.error.kind === "http" || result.error.kind === "auth" ||
          result.error.kind === "network",
        `unexpected invoke error: ${JSON.stringify(result.error)}`,
      );
    }
  } finally {
    await client.agents.delete(agentId);
  }
});

e2eTest("admin.agents.dailyActivity returns the activity rollup", async ({ client }) => {
  const result = await client.agents.dailyActivity({
    start_date: "2026-05-20",
    end_date: "2026-05-27",
    page: 1,
    page_size: 10,
  });
  if (!result.ok) {
    // Enterprise-only on some builds.
    assert(
      result.error.kind === "http" || result.error.kind === "auth",
      `unexpected dailyActivity error: ${JSON.stringify(result.error)}`,
    );
  }
});
