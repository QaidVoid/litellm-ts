import { assertEquals, assertStrictEquals } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import { createTransport, type TransportConfig } from "./transport.ts";

type FetchCall = {
  readonly input: string | URL | Request;
  readonly init: RequestInit | undefined;
};

const recordingFetch = (
  responses: ReadonlyArray<() => Response | Promise<Response>>,
): { fetch: typeof fetch; calls: FetchCall[] } => {
  const calls: FetchCall[] = [];
  let i = 0;
  const fetchFn: typeof fetch = (input, init) => {
    calls.push({ input, init });
    const make = responses[i++];
    if (make === undefined) {
      throw new Error(`mock fetch exhausted at call ${i}`);
    }
    return Promise.resolve(make());
  };
  return { fetch: fetchFn, calls };
};

const baseConfig = (overrides: Partial<TransportConfig> = {}): TransportConfig => ({
  baseUrl: "https://api.test",
  apiKey: "test-key",
  maxRetries: 0,
  ...overrides,
});

const json = (body: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers as object | undefined) },
  });

Deno.test("request returns parsed JSON on 2xx", async () => {
  const { fetch, calls } = recordingFetch([() => json({ hi: 1 })]);
  const t = createTransport(baseConfig({ fetch }));
  const result = await t.request<{ hi: number }>({ method: "GET", path: "/foo" });
  assertEquals(result, { ok: true, value: { hi: 1 } });
  assertEquals(calls.length, 1);
  assertStrictEquals(calls[0]?.input, "https://api.test/foo");
});

Deno.test("request applies Authorization, default headers, and JSON body", async () => {
  const { fetch, calls } = recordingFetch([() => json({})]);
  const t = createTransport(
    baseConfig({ fetch, defaultHeaders: { "x-extra": "yes" } }),
  );
  await t.request({ method: "POST", path: "/v1/chat", body: { model: "gpt-4o" } });
  const init = calls[0]?.init;
  const headers = new Headers(init?.headers);
  assertStrictEquals(headers.get("authorization"), "Bearer test-key");
  assertStrictEquals(headers.get("x-extra"), "yes");
  assertStrictEquals(headers.get("content-type"), "application/json");
  assertStrictEquals(init?.body, '{"model":"gpt-4o"}');
});

Deno.test("request normalizes baseUrl and path joining", async () => {
  const cases = [
    { base: "https://api.test", path: "/v1/x", want: "https://api.test/v1/x" },
    { base: "https://api.test/", path: "v1/x", want: "https://api.test/v1/x" },
    { base: "https://api.test/api", path: "/v1/x", want: "https://api.test/api/v1/x" },
    { base: "https://api.test/api/", path: "v1/x", want: "https://api.test/api/v1/x" },
  ];
  for (const { base, path, want } of cases) {
    const { fetch, calls } = recordingFetch([() => json({})]);
    const t = createTransport(baseConfig({ fetch, baseUrl: base }));
    await t.request({ method: "GET", path });
    assertStrictEquals(calls[0]?.input, want, `base=${base} path=${path}`);
  }
});

Deno.test("request encodes query string entries, skipping undefined", async () => {
  const { fetch, calls } = recordingFetch([() => json({})]);
  const t = createTransport(baseConfig({ fetch }));
  await t.request({
    method: "GET",
    path: "/q",
    query: { a: "1", b: 2, c: true, d: undefined },
  });
  const url = new URL(calls[0]?.input as string);
  assertStrictEquals(url.searchParams.get("a"), "1");
  assertStrictEquals(url.searchParams.get("b"), "2");
  assertStrictEquals(url.searchParams.get("c"), "true");
  assertStrictEquals(url.searchParams.has("d"), false);
});

Deno.test("401 maps to auth error with reason 'invalid'", async () => {
  const { fetch } = recordingFetch([
    () => new Response("", { status: 401, statusText: "Unauthorized" }),
  ]);
  const t = createTransport(baseConfig({ fetch }));
  const result = await t.request({ method: "GET", path: "/x" });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, { kind: "auth", reason: "invalid", status: 401 });
  }
});

Deno.test("403 maps to auth error with reason 'forbidden'", async () => {
  const { fetch } = recordingFetch([
    () => new Response("", { status: 403, statusText: "Forbidden" }),
  ]);
  const t = createTransport(baseConfig({ fetch }));
  const result = await t.request({ method: "GET", path: "/x" });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, { kind: "auth", reason: "forbidden", status: 403 });
  }
});

Deno.test("429 parses Retry-After in seconds", async () => {
  const { fetch } = recordingFetch([
    () =>
      new Response("rate limited", {
        status: 429,
        headers: { "retry-after": "3" },
      }),
  ]);
  const t = createTransport(baseConfig({ fetch }));
  const result = await t.request({ method: "GET", path: "/x" });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, {
      kind: "rate-limited",
      status: 429,
      retryAfterMs: 3000,
    });
  }
});

Deno.test("5xx maps to http error with parsed JSON body and request id", async () => {
  const { fetch } = recordingFetch([
    () =>
      new Response(JSON.stringify({ error: "boom" }), {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "x-litellm-call-id": "call-abc" },
      }),
  ]);
  const t = createTransport(baseConfig({ fetch }));
  const result = await t.request({ method: "GET", path: "/x" });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, {
      kind: "http",
      status: 503,
      statusText: "Service Unavailable",
      body: { error: "boom" },
      requestId: "call-abc",
    });
  }
});

Deno.test("fetch throw maps to network error", async () => {
  const fetchFn: typeof fetch = () => Promise.reject(new TypeError("ECONNREFUSED"));
  const t = createTransport(baseConfig({ fetch: fetchFn }));
  const result = await t.request({ method: "GET", path: "/x" });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertStrictEquals(result.error.kind, "network");
    if (result.error.kind === "network") {
      assertStrictEquals(result.error.message, "ECONNREFUSED");
    }
  }
});

Deno.test("non-JSON response body on 2xx surfaces a validation error", async () => {
  const { fetch } = recordingFetch([() => new Response("not json", { status: 200 })]);
  const t = createTransport(baseConfig({ fetch }));
  const result = await t.request({ method: "GET", path: "/x" });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertStrictEquals(result.error.kind, "validation");
  }
});

Deno.test("body that cannot be JSON-stringified surfaces a validation error", async () => {
  const { fetch } = recordingFetch([() => json({})]);
  const t = createTransport(baseConfig({ fetch }));
  const result = await t.request({
    method: "POST",
    path: "/x",
    body: { bad: 1n },
  });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertStrictEquals(result.error.kind, "validation");
  }
});

Deno.test("retries once on 5xx then succeeds", async () => {
  const time = new FakeTime();
  try {
    const { fetch, calls } = recordingFetch([
      () => new Response("oops", { status: 500 }),
      () => json({ done: true }),
    ]);
    const t = createTransport(baseConfig({ fetch, maxRetries: 1 }));
    const promise = t.request<{ done: boolean }>({ method: "GET", path: "/x" });
    await time.runMicrotasks();
    await time.runAllAsync();
    const result = await promise;
    assertEquals(result, { ok: true, value: { done: true } });
    assertEquals(calls.length, 2);
  } finally {
    time.restore();
  }
});

Deno.test("does not retry on non-retryable 400", async () => {
  const { fetch, calls } = recordingFetch([
    () => new Response("bad", { status: 400, statusText: "Bad Request" }),
  ]);
  const t = createTransport(baseConfig({ fetch, maxRetries: 3 }));
  const result = await t.request({ method: "GET", path: "/x" });
  assertEquals(result.ok, false);
  assertEquals(calls.length, 1);
});

Deno.test("stream returns the raw response body and sets accept header", async () => {
  const body = "data: {}\n\n";
  const { fetch, calls } = recordingFetch([
    () => new Response(body, { status: 200 }),
  ]);
  const t = createTransport(baseConfig({ fetch }));
  const result = await t.stream({ method: "POST", path: "/v1/chat", body: { stream: true } });
  assertEquals(result.ok, true);
  if (result.ok) {
    const text = await new Response(result.value).text();
    assertStrictEquals(text, body);
  }
  const headers = new Headers(calls[0]?.init?.headers);
  assertStrictEquals(headers.get("accept"), "text/event-stream");
});

Deno.test("FormData body is passed through without JSON serialization or content-type", async () => {
  const { fetch, calls } = recordingFetch([() => json({})]);
  const t = createTransport(baseConfig({ fetch }));
  const fd = new FormData();
  fd.append("model", "whisper-1");
  fd.append("file", new Blob([new Uint8Array([1, 2, 3])]), "clip.bin");
  await t.request({ method: "POST", path: "/v1/audio/transcriptions", body: fd });
  const init = calls[0]?.init;
  assertEquals(init?.body instanceof FormData, true);
  const headers = new Headers(init?.headers);
  assertStrictEquals(headers.has("content-type"), false);
});

Deno.test("fetchRaw returns the raw Response without parsing", async () => {
  const { fetch } = recordingFetch([
    () =>
      new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: { "content-type": "audio/mpeg" },
      }),
  ]);
  const t = createTransport(baseConfig({ fetch }));
  const result = await t.fetchRaw({
    method: "POST",
    path: "/v1/audio/speech",
    body: { input: "hi" },
  });
  assertEquals(result.ok, true);
  if (result.ok) {
    const bytes = new Uint8Array(await result.value.arrayBuffer());
    assertEquals([...bytes], [1, 2, 3, 4]);
  }
});

Deno.test("fetchRaw still surfaces non-2xx as ApiError", async () => {
  const { fetch } = recordingFetch([() => new Response("nope", { status: 404 })]);
  const t = createTransport(baseConfig({ fetch }));
  const result = await t.fetchRaw({ method: "GET", path: "/x" });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertStrictEquals(result.error.kind, "http");
  }
});
