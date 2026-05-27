import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// Rerank endpoints require a true rerank-capable provider (Cohere, etc.)
// configured on the proxy. Against an Ollama-backed model the proxy raises
// "Unsupported provider" as a 500. We accept that as a smoke pass.

e2eTest("rerank.create routes to /v1/rerank and tolerates provider gaps", async ({ client, models }) => {
  const result = await client.rerank.create({
    model: models.chat,
    query: "what is the capital of France?",
    documents: ["Paris is the capital of France.", "Berlin is in Germany.", "Madrid is in Spain."],
    top_n: 2,
  });

  if (!result.ok) {
    assertStrictEquals(result.error.kind, "http");
    if (result.error.kind === "http") {
      assert(
        result.error.status === 500 || result.error.status === 400,
        `unexpected status: ${result.error.status}`,
      );
    }
    return;
  }
  assert(Array.isArray(result.value.results), "expected results array");
}, { requires: ["chat"] });

e2eTest(
  "rerank.createV2 routes to /v2/rerank and tolerates provider gaps",
  async ({ client, models }) => {
    const result = await client.rerank.createV2({
      model: models.chat,
      query: "tell me about cats",
      documents: ["Cats are mammals.", "Dogs are also mammals."],
      return_documents: true,
    });

    if (!result.ok) {
      assertStrictEquals(result.error.kind, "http");
      if (result.error.kind === "http") {
        assert(
          result.error.status === 500 || result.error.status === 400,
          `unexpected status: ${result.error.status}`,
        );
      }
      return;
    }
    assert(Array.isArray(result.value.results), "expected results array");
  },
  { requires: ["chat"] },
);
