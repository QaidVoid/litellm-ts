import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest, MODELS } from "./_helpers.ts";

e2eTest(
  "messages.create returns an Anthropic-shape response",
  async ({ client }) => {
    // `/v1/messages` is Anthropic's native shape. For backends that aren't
    // Anthropic, the proxy auto-translates between the chat and messages
    // shapes, so any chat-capable model works here.
    const result = await client.messages.create({
      model: MODELS.chat!,
      max_tokens: 20,
      messages: [{ role: "user", content: "Reply with one word: orange." }],
    });

    assert(result.ok, `expected ok, got ${JSON.stringify(result)}`);
    const response = result.value;
    assertStrictEquals(response.type, "message");
    assertStrictEquals(response.role, "assistant");
    assert(Array.isArray(response.content));
    assert(response.content.length > 0, "expected at least one content block");
  },
  { requires: ["chat"] },
);

e2eTest(
  "messages.createStream yields events and terminates",
  async ({ client }) => {
    const stream = client.messages.createStream({
      model: MODELS.chat!,
      max_tokens: 20,
      messages: [{ role: "user", content: "Reply: x." }],
    });

    let events = 0;
    for await (const event of stream) {
      assert(event.ok, `bad frame: ${JSON.stringify(event)}`);
      events++;
      if (events > 200) throw new Error("stream did not terminate");
    }
    assert(events > 0, "stream produced no events");
  },
  { requires: ["chat"] },
);

e2eTest(
  "messages.countTokens returns a non-zero count for a non-empty prompt",
  async ({ client }) => {
    const result = await client.messages.countTokens({
      model: MODELS.chat!,
      messages: [{ role: "user", content: "Hello world." }],
    });

    assert(result.ok, `expected ok, got ${JSON.stringify(result)}`);
    assert(result.value.input_tokens > 0, "expected non-zero token count");
  },
  { requires: ["chat"] },
);
