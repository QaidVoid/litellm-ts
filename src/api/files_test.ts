import { assertEquals, assertStrictEquals } from "@std/assert";
import { createClient } from "../client.ts";
import type { FileObject } from "./files.ts";

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

const fileObject: FileObject = {
  id: "file-abc",
  object: "file",
  bytes: 1024,
  created_at: 1716,
  filename: "data.jsonl",
  purpose: "batch",
  status: "uploaded",
};

Deno.test("files.create sends a multipart upload with file and purpose", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(fileObject), {
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
  const result = await client.files.create({
    file: new Uint8Array([1, 2, 3]),
    filename: "data.jsonl",
    purpose: "batch",
  });
  assertEquals(result, { ok: true, value: fileObject });
  assertStrictEquals(calls[0]?.input, "https://api.test/v1/files");
  assertStrictEquals(calls[0]?.init?.method, "POST");
  const body = calls[0]?.init?.body as FormData;
  assertEquals(body instanceof FormData, true);
  assertStrictEquals(body.get("purpose"), "batch");
  assertEquals(body.get("file") instanceof Blob, true);
});

Deno.test("files.list passes the purpose filter as a query string parameter", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({ object: "list", data: [fileObject] }), {
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
  await client.files.list({ purpose: "batch" });
  const url = new URL(calls[0]?.input as string);
  assertStrictEquals(url.pathname, "/v1/files");
  assertStrictEquals(url.searchParams.get("purpose"), "batch");
});

Deno.test("files.retrieve encodes the file id into the URL path", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(fileObject), {
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
  await client.files.retrieve("file-with/slash");
  assertStrictEquals(calls[0]?.input, "https://api.test/v1/files/file-with%2Fslash");
});

Deno.test("files.delete issues DELETE and returns the deletion record", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({ id: "file-abc", object: "file", deleted: true }), {
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
  const result = await client.files.delete("file-abc");
  assertStrictEquals(calls[0]?.init?.method, "DELETE");
  assertEquals(result, {
    ok: true,
    value: { id: "file-abc", object: "file", deleted: true },
  });
});

Deno.test("files.content returns the raw bytes of the response body", async () => {
  const bytes = new Uint8Array([0x11, 0x22, 0x33, 0x44]);
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(bytes, {
        status: 200,
        headers: { "content-type": "application/octet-stream" },
      }),
  ]);
  const client = createClient({
    baseUrl: "https://api.test",
    apiKey: "test",
    maxRetries: 0,
    fetch,
  });
  const result = await client.files.content("file-abc");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals([...result.value], [...bytes]);
  }
  assertStrictEquals(calls[0]?.input, "https://api.test/v1/files/file-abc/content");
});
