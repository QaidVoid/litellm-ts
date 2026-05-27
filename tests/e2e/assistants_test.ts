import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// Assistants + threads route through to OpenAI (or another vendor that
// implements the Assistants API). On most LiteLLM deployments without
// OPENAI_API_KEY, the routes 4xx/5xx — we just verify the SDK wires the
// call.

const tolerantAssistants = (result: {
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
  throw new Error(`unexpected assistants error: ${JSON.stringify(e)}`);
};

e2eTest("assistants.list returns the assistant listing", async ({ client }) => {
  const result = await client.assistants.list({ limit: 5 });
  if (!result.ok) {
    tolerantAssistants(result);
    return;
  }
  assert(result.value.object === "list");
});

e2eTest("assistants.create + delete round-trip", async ({ client, models }) => {
  const result = await client.assistants.create({
    model: models.chat,
    name: `e2e-assistant-${Date.now()}`,
    instructions: "You are a helpful test assistant.",
  });
  if (!result.ok) {
    tolerantAssistants(result);
    return;
  }
  const removed = await client.assistants.delete(result.value.id);
  if (!removed.ok) tolerantAssistants(removed);
}, { requires: ["chat"] });

e2eTest("threads.create + retrieve round-trip", async ({ client }) => {
  const created = await client.threads.create({
    metadata: { purpose: "e2e" },
  });
  if (!created.ok) {
    tolerantAssistants(created);
    return;
  }
  const got = await client.threads.retrieve(created.value.id);
  if (!got.ok) tolerantAssistants(got);
});

e2eTest("threads.messages.create + list round-trip", async ({ client }) => {
  const created = await client.threads.create();
  if (!created.ok) {
    tolerantAssistants(created);
    return;
  }
  const threadId = created.value.id;

  const message = await client.threads.messages.create(threadId, {
    role: "user",
    content: "hello",
  });
  if (!message.ok) {
    tolerantAssistants(message);
    return;
  }

  const list = await client.threads.messages.list(threadId, { limit: 5 });
  if (!list.ok) tolerantAssistants(list);
});

e2eTest("threads.runs.create smoke-runs a synthetic run", async ({ client, models }) => {
  const created = await client.threads.create();
  if (!created.ok) {
    tolerantAssistants(created);
    return;
  }
  // Use a likely-nonexistent assistant id so we don't accidentally invoke
  // a real upstream. Any 4xx/5xx is acceptable.
  const result = await client.threads.runs.create(created.value.id, {
    assistant_id: `e2e-no-such-assistant-${Date.now()}`,
    model: models.chat,
  });
  tolerantAssistants(result);
}, { requires: ["chat"] });
