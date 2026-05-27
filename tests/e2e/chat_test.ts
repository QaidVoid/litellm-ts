import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest(
  "chat.create returns assistant content for the primary chat model",
  async ({ client, models }) => {
    const result = await client.chat.create({
      model: models.chat,
      messages: [
        { role: "user", content: "Reply with exactly one word: orange. No punctuation." },
      ],
      max_tokens: 20,
      temperature: 0,
    });

    assert(result.ok, `expected ok, got ${JSON.stringify(result)}`);
    const completion = result.value;
    assertEquals(completion.object, "chat.completion");
    assertStrictEquals(completion.choices.length, 1);
    const message = completion.choices[0]?.message;
    assert(message !== undefined, "expected first choice to have a message");
    assertStrictEquals(message?.role, "assistant");
    assert(
      typeof message?.content === "string" && message.content.length > 0,
      "expected text reply",
    );
    assert((completion.usage?.total_tokens ?? 0) > 0, "expected non-zero usage");
  },
  { requires: ["chat"] },
);

e2eTest(
  "chat.create works against a second backend (cross-provider sanity)",
  async ({ client, models }) => {
    const result = await client.chat.create({
      model: models.chatAlt,
      messages: [{ role: "user", content: "Reply with exactly one word: violet." }],
      max_tokens: 20,
      temperature: 0,
    });

    assert(result.ok, `expected ok, got ${JSON.stringify(result)}`);
    const text = result.value.choices[0]?.message.content;
    assert(typeof text === "string" && text.length > 0, "expected text reply");
  },
  { requires: ["chatAlt"] },
);

e2eTest("chat.createStream yields chunks and terminates cleanly", async ({ client, models }) => {
  const stream = client.chat.createStream({
    model: models.chat,
    messages: [{ role: "user", content: "Count from 1 to 3, one number per line." }],
    max_tokens: 50,
    temperature: 0,
  });

  let chunks = 0;
  let assembled = "";
  for await (const chunk of stream) {
    assert(chunk.ok, `bad frame: ${JSON.stringify(chunk)}`);
    chunks++;
    const delta = chunk.value.choices[0]?.delta.content;
    if (typeof delta === "string") assembled += delta;
  }

  assert(chunks > 0, "stream produced no chunks");
  assert(assembled.length > 0, "stream assembled empty content");
}, { requires: ["chat"] });

e2eTest(
  "chat.create round-trips reasoning_content when the reasoning model is configured",
  async ({ client, models }) => {
    // Reasoning models emit a `reasoning_content` field alongside the
    // assistant message. The proxy should pass it through; we don't assert
    // that it's always populated (qwen sometimes omits it for trivial
    // prompts), only that the call completes and the field round-trips
    // when present.
    const result = await client.chat.create({
      model: models.reasoning,
      messages: [{ role: "user", content: "What is 12 times 4? Give just the number." }],
      max_tokens: 80,
      temperature: 0,
    });

    assert(result.ok, `expected ok, got ${JSON.stringify(result)}`);
    const message = result.value.choices[0]?.message as
      | { readonly reasoning_content?: unknown }
      | undefined;
    const reasoning = message?.reasoning_content;
    if (reasoning !== undefined) {
      assertStrictEquals(typeof reasoning, "string");
    }
  },
  { requires: ["reasoning"] },
);

e2eTest(
  "chat.create + chat.createStream both yield non-empty output for the same prompt",
  async ({ client, models }) => {
    const prompt = "Reply with exactly the single word 'banana'. No other text.";
    const opts = {
      model: models.chat,
      messages: [{ role: "user" as const, content: prompt }],
      max_tokens: 10,
      temperature: 0,
    };

    const nonStream = await client.chat.create(opts);
    assert(nonStream.ok);
    const direct = nonStream.value.choices[0]?.message.content ?? "";

    let assembled = "";
    for await (const chunk of client.chat.createStream(opts)) {
      assert(chunk.ok);
      assembled += chunk.value.choices[0]?.delta.content ?? "";
    }

    // Local LLMs aren't byte-for-byte deterministic between stream and
    // non-stream paths even at temperature 0; we just confirm both produced
    // *some* output.
    assert(direct.length > 0, "non-stream returned empty");
    assert(assembled.length > 0, "stream returned empty");
  },
  { requires: ["chat"] },
);
