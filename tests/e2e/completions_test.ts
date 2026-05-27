import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest, MODELS } from "./_helpers.ts";

e2eTest(
  "completions.create returns a non-empty text completion",
  async ({ client }) => {
    // The legacy `/v1/completions` endpoint expects a prompt string,
    // not a chat message array. Many local backends (including Ollama)
    // route this through the chat-template path under the hood.
    const result = await client.completions.create({
      model: MODELS.chat!,
      prompt: "Complete this with one word: orange. The next word is",
      max_tokens: 5,
      temperature: 0,
    });

    assert(result.ok, `expected ok, got ${JSON.stringify(result)}`);
    assertStrictEquals(result.value.object, "text_completion");
    assertStrictEquals(result.value.choices.length, 1);
    const text = result.value.choices[0]?.text;
    assert(typeof text === "string" && text.length > 0, "expected non-empty text");
  },
  { requires: ["chat"] },
);

e2eTest(
  "completions.createStream yields chunks and terminates cleanly",
  async ({ client }) => {
    const stream = client.completions.createStream({
      model: MODELS.chat!,
      prompt: "One, two,",
      max_tokens: 10,
      temperature: 0,
    });

    let chunks = 0;
    let assembled = "";
    for await (const chunk of stream) {
      assert(chunk.ok, `bad frame: ${JSON.stringify(chunk)}`);
      chunks++;
      const text = chunk.value.choices[0]?.text;
      if (typeof text === "string") assembled += text;
    }

    assert(chunks > 0, "stream produced no chunks");
    assert(assembled.length > 0, "stream assembled empty content");
  },
  { requires: ["chat"] },
);
