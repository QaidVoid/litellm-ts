import { assertEquals, assertStrictEquals } from "@std/assert";
import { createClient } from "../client.ts";
import type { EmbeddingsResponse } from "./embeddings.ts";

const recordingFetch = (
  responses: ReadonlyArray<() => Response | Promise<Response>>,
): {
  fetch: typeof fetch;
  calls: Array<{ input: string | URL | Request; init: RequestInit | undefined }>;
} => {
  const calls: Array<{ input: string | URL | Request; init: RequestInit | undefined }> = [];
  let i = 0;
  const fetchFn: typeof fetch = (input, init) => {
    calls.push({ input, init });
    const make = responses[i++];
    if (make === undefined) throw new Error(`mock fetch exhausted at call ${i}`);
    return Promise.resolve(make());
  };
  return { fetch: fetchFn, calls };
};

const embeddingResponse: EmbeddingsResponse = {
  object: "list",
  data: [{ object: "embedding", embedding: [0.1, 0.2, 0.3], index: 0 }],
  model: "text-embedding-3-small",
  usage: { prompt_tokens: 2, total_tokens: 2 },
};

Deno.test("client.embeddings.create posts to /v1/embeddings with the request body", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(embeddingResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = createClient({
    baseUrl: "https://api.test",
    apiKey: "test",
    maxRetries: 0,
    fetch,
  });
  const result = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: "hello world",
  });
  assertEquals(result, { ok: true, value: embeddingResponse });
  assertStrictEquals(calls[0]?.input, "https://api.test/v1/embeddings");
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body, { model: "text-embedding-3-small", input: "hello world" });
});

Deno.test("client.embeddings.create accepts an array input", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(embeddingResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = createClient({
    baseUrl: "https://api.test",
    apiKey: "test",
    maxRetries: 0,
    fetch,
  });
  await client.embeddings.create({
    model: "text-embedding-3-small",
    input: ["a", "b", "c"],
    dimensions: 256,
    encoding_format: "float",
  });
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body.input, ["a", "b", "c"]);
  assertStrictEquals(body.dimensions, 256);
  assertStrictEquals(body.encoding_format, "float");
});

Deno.test({
  name: "type-level: embeddings.create model is constrained to embedding-mode models",
  ignore: true,
  fn: () => {
    const client = createClient({ baseUrl: "https://x", apiKey: "k" });

    void client.embeddings.create({
      model: "text-embedding-3-small",
      input: "x",
    });

    void client.embeddings.create({
      // @ts-expect-error gpt-4o is a chat model, not an embedding model
      model: "gpt-4o",
      input: "x",
    });
  },
});
