import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest, MODELS } from "./_helpers.ts";

e2eTest(
  "responses.create produces an output for a simple string input",
  async ({ client }) => {
    const result = await client.responses.create({
      model: MODELS.chat!,
      input: "Reply with one word: orange.",
      max_output_tokens: 50,
      temperature: 0,
      store: false,
    });

    assert(result.ok, `expected ok, got ${JSON.stringify(result)}`);
    const response = result.value;
    assert(typeof response.id === "string" && response.id.length > 0, "expected an id");
    assertStrictEquals(response.object, "response");
    assert(Array.isArray(response.output));
    assert(response.output.length > 0, "expected at least one output item");
  },
  { requires: ["chat"] },
);

e2eTest(
  "responses.createStream yields events and terminates",
  async ({ client }) => {
    const stream = client.responses.createStream({
      model: MODELS.chat!,
      input: "Count: one, two,",
      max_output_tokens: 30,
      temperature: 0,
      store: false,
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
