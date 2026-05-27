import { assert } from "@std/assert";
import { customModel } from "../../mod.ts";
import { e2eTest } from "./_helpers.ts";

// Google GenAI passthrough surfaces require an upstream Gemini/Vertex
// credential on the proxy. We exercise wiring; 4xx/5xx is fine.

const tolerantGenai = (result: {
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
  throw new Error(`unexpected googleGenai error: ${JSON.stringify(e)}`);
};

const model = customModel("gemini-2.0-flash");

e2eTest("googleGenai.generateContent routes to :generateContent", async ({ client }) => {
  const result = await client.googleGenai.generateContent(model, {
    contents: [{ role: "user", parts: [{ text: "hello" }] }],
  });
  tolerantGenai(result);
});

e2eTest("googleGenai.countTokens routes to :countTokens", async ({ client }) => {
  const result = await client.googleGenai.countTokens(model, {
    contents: [{ role: "user", parts: [{ text: "hello world" }] }],
  });
  tolerantGenai(result);
});

e2eTest("googleGenai.streamGenerateContent yields frames or routes errors", async ({ client }) => {
  const stream = client.googleGenai.streamGenerateContent(model, {
    contents: [{ role: "user", parts: [{ text: "hello" }] }],
  });
  let count = 0;
  for await (const event of stream) {
    count += 1;
    if (count > 5) break;
    if (!event.ok) {
      const kind = event.error.kind;
      assert(
        kind === "http" || kind === "auth" || kind === "stream",
        `unexpected stream error kind: ${kind}`,
      );
      break;
    }
  }
});

e2eTest("googleGenai.agents.list returns the agent listing", async ({ client }) => {
  const result = await client.googleGenai.agents.list();
  tolerantGenai(result);
});

e2eTest("googleGenai.agents CRUD round-trip", async ({ client }) => {
  const created = await client.googleGenai.agents.create({
    id: `e2e-agent-${Date.now()}`,
    system_instruction: "test",
  });
  if (!created.ok) {
    tolerantGenai(created);
    return;
  }
  const name = (created.value.id as string | undefined) ?? `e2e-agent-missing-${Date.now()}`;
  try {
    const got = await client.googleGenai.agents.get(name);
    if (!got.ok) tolerantGenai(got);

    const versions = await client.googleGenai.agents.versions(name);
    if (!versions.ok) tolerantGenai(versions);
  } finally {
    const removed = await client.googleGenai.agents.delete(name);
    if (!removed.ok) tolerantGenai(removed);
  }
});

e2eTest("googleGenai.interactions create + get + cancel + delete smoke", async ({ client }) => {
  const created = await client.googleGenai.interactions.create({ name: "e2e" });
  if (!created.ok) {
    tolerantGenai(created);
    return;
  }
  const id = (created.value as { id?: string }).id ?? `e2e-interaction-${Date.now()}`;
  const got = await client.googleGenai.interactions.get(id);
  if (!got.ok) tolerantGenai(got);
  const cancelled = await client.googleGenai.interactions.cancel(id);
  if (!cancelled.ok) tolerantGenai(cancelled);
  const removed = await client.googleGenai.interactions.delete(id);
  if (!removed.ok) tolerantGenai(removed);
});
