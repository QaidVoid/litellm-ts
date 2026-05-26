import { assertStrictEquals } from "@std/assert";
import { createClient } from "../client.ts";
import type { FineTuningJob } from "./fine_tuning.ts";

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

const sampleJob: FineTuningJob = {
  id: "ftjob-1",
  object: "fine_tuning.job",
  created_at: 1716,
  model: "gpt-4o-mini",
  training_file: "file-train",
  status: "queued",
};

Deno.test("fineTuning.create POSTs to /v1/fine_tuning/jobs", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(sampleJob), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.fineTuning.create({ model: "gpt-4o-mini", training_file: "file-train" });
  assertStrictEquals(calls[0]?.input, "https://api.test/v1/fine_tuning/jobs");
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertStrictEquals(body.training_file, "file-train");
});

Deno.test("fineTuning.cancel POSTs to /v1/fine_tuning/jobs/{id}/cancel", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({ ...sampleJob, status: "cancelled" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.fineTuning.cancel("ftjob-1");
  assertStrictEquals(calls[0]?.input, "https://api.test/v1/fine_tuning/jobs/ftjob-1/cancel");
  assertStrictEquals(calls[0]?.init?.method, "POST");
});

Deno.test("fineTuning.events GETs the events sub-resource", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({ object: "list", data: [], has_more: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.fineTuning.events("ftjob-1", { limit: 50 });
  const url = new URL(calls[0]?.input as string);
  assertStrictEquals(url.pathname, "/v1/fine_tuning/jobs/ftjob-1/events");
  assertStrictEquals(url.searchParams.get("limit"), "50");
});
