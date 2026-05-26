import { assertEquals, assertStrictEquals } from "@std/assert";
import { createClient } from "../client.ts";
import type { RerankResponse } from "./rerank.ts";

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

const rerankResponse: RerankResponse = {
  id: "rerank-123",
  results: [
    { index: 2, relevance_score: 0.91 },
    { index: 0, relevance_score: 0.62 },
    { index: 1, relevance_score: 0.31 },
  ],
};

Deno.test("client.rerank.create posts to /v1/rerank with the request body", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(rerankResponse), {
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
  const result = await client.rerank.create({
    model: "rerank-english-v3.0",
    query: "best framework for building agents",
    documents: ["pytorch", "react", "deno"],
    top_n: 3,
  });
  assertEquals(result, { ok: true, value: rerankResponse });
  assertStrictEquals(calls[0]?.input, "https://api.test/v1/rerank");
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body, {
    model: "rerank-english-v3.0",
    query: "best framework for building agents",
    documents: ["pytorch", "react", "deno"],
    top_n: 3,
  });
});
