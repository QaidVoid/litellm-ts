import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest(
  "responses.create produces an output for a simple string input",
  async ({ client, models }) => {
    const result = await client.responses.create({
      model: models.chat,
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
  async ({ client, models }) => {
    const stream = client.responses.createStream({
      model: models.chat,
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

e2eTest(
  "responses stored lifecycle: retrieve / listInputItems / compact / cancel / delete",
  async ({ client, models }) => {
    // Persist the response so the storage-dependent endpoints have
    // something to operate on.
    const created = await client.responses.create({
      model: models.chat,
      input: "Reply with one word: violet.",
      max_output_tokens: 10,
      temperature: 0,
      store: true,
    });
    assert(created.ok, `create failed: ${JSON.stringify(created)}`);
    const responseId = created.value.id;

    // Backends that don't implement the Responses storage layer (e.g.
    // Ollama) surface 5xx on retrieve/list. Treat 4xx/5xx as expected.
    const tolerate = (
      label: string,
      r: { ok: boolean; error?: { kind: string; status?: number } },
    ) => {
      if (r.ok) return true;
      const e = r.error!;
      if (e.kind === "http" || e.kind === "auth") return false;
      throw new Error(`${label} transport error: ${JSON.stringify(e)}`);
    };

    try {
      // Retrieve round-trips the same id (or 5xx on backends without storage).
      const got = await client.responses.retrieve(responseId);
      if (tolerate("retrieve", got) && got.ok) {
        assertStrictEquals(got.value.id, responseId);
      }

      const inputItems = await client.responses.listInputItems(responseId, { limit: 5 });
      if (tolerate("listInputItems", inputItems) && inputItems.ok) {
        assert(Array.isArray(inputItems.value.data));
      }

      // Compact is a noop on a single-turn response but should round-trip.
      const compacted = await client.responses.compact({
        model: models.chat,
        input: "Reply with one word: violet.",
      });
      // Compact is enterprise-gated on some builds; tolerate 4xx.
      if (!compacted.ok) {
        assert(
          compacted.error.kind === "http" || compacted.error.kind === "auth",
          `unexpected compact error: ${JSON.stringify(compacted.error)}`,
        );
      }

      // Cancel is a no-op for a completed response but exercises the route.
      const cancelled = await client.responses.cancel(responseId);
      if (!cancelled.ok) {
        // Cancelling a completed response often 4xxs.
        assert(
          cancelled.error.kind === "http",
          `unexpected cancel error: ${JSON.stringify(cancelled.error)}`,
        );
      }
    } finally {
      const deleted = await client.responses.delete(responseId);
      // Delete is best-effort; only fail on transport-level errors.
      if (!deleted.ok) {
        assert(
          deleted.error.kind === "http",
          `unexpected delete error: ${JSON.stringify(deleted.error)}`,
        );
      }
    }
  },
  { requires: ["chat"] },
);
