import { assertStrictEquals } from "@std/assert";
import { createClient } from "../client.ts";
import type { Batch } from "./batches.ts";

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

const baseClient = (fetchFn: typeof fetch) =>
  createClient({ baseUrl: "https://api.test", apiKey: "test", maxRetries: 0, fetch: fetchFn });

const sampleBatch: Batch = {
  id: "batch_1",
  object: "batch",
  endpoint: "/v1/chat/completions",
  input_file_id: "file-abc",
  completion_window: "24h",
  status: "validating",
  created_at: 1716,
};

Deno.test("batches.create POSTs to /v1/batches with the request body", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(sampleBatch), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.batches.create({
    input_file_id: "file-abc",
    endpoint: "/v1/chat/completions",
    completion_window: "24h",
  });
  assertStrictEquals(calls[0]?.input, "https://api.test/v1/batches");
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertStrictEquals(body.endpoint, "/v1/chat/completions");
});

Deno.test("batches.retrieve GETs /v1/batches/{id}", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(sampleBatch), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.batches.retrieve("batch_1");
  assertStrictEquals(calls[0]?.input, "https://api.test/v1/batches/batch_1");
});

Deno.test("batches.cancel POSTs to /v1/batches/{id}/cancel", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({ ...sampleBatch, status: "cancelling" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.batches.cancel("batch_1");
  assertStrictEquals(calls[0]?.input, "https://api.test/v1/batches/batch_1/cancel");
  assertStrictEquals(calls[0]?.init?.method, "POST");
});
