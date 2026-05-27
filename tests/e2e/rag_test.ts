import { assert } from "@std/assert";
import { e2eTest, MODELS } from "./_helpers.ts";

// `/v1/rag/*` requires a configured upstream vector store + embedding +
// generation pipeline. None of that is required to live on the proxy for
// this test to be meaningful — we just route a representative request
// for each method and confirm the SDK surfaces a structured failure.

e2eTest(
  "rag.ingest routes to /v1/rag/ingest and surfaces upstream errors",
  async ({ client }) => {
    const result = await client.rag.ingest({
      ingest_options: {
        vector_store: {
          custom_llm_provider: "openai",
        },
      },
      file: {
        filename: "hello.txt",
        content: btoa("hello world"),
        content_type: "text/plain",
      },
    });
    if (result.ok) return;
    assert(
      result.error.kind === "http" || result.error.kind === "auth",
      `unexpected error kind: ${result.error.kind}`,
    );
    if (result.error.kind === "http") {
      const s = result.error.status;
      assert(
        s === 400 || s === 401 || s === 403 || s === 404 || s === 422 || s === 500,
        `unexpected status ${s}: ${JSON.stringify(result.error)}`,
      );
    }
  },
);

e2eTest(
  "rag.query routes to /v1/rag/query and surfaces upstream errors",
  async ({ client }) => {
    const model = MODELS.chat ?? "gpt-4o-mini";
    const result = await client.rag.query({
      model,
      messages: [{ role: "user", content: "What is in the context?" }],
      retrieval_config: { vector_store_id: "nonexistent-vs", top_k: 3 },
    });
    if (result.ok) return;
    assert(
      result.error.kind === "http" || result.error.kind === "auth",
      `unexpected error kind: ${result.error.kind}`,
    );
    if (result.error.kind === "http") {
      const s = result.error.status;
      assert(
        s === 400 || s === 401 || s === 403 || s === 404 || s === 422 || s === 500,
        `unexpected status ${s}: ${JSON.stringify(result.error)}`,
      );
    }
  },
);
