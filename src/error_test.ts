import { assertEquals, assertStrictEquals } from "@std/assert";
import {
  type ApiError,
  authError,
  formatApiError,
  httpError,
  networkError,
  rateLimitedError,
  streamError,
  timeoutError,
  validationError,
} from "./error.ts";

Deno.test("networkError captures cause and message", () => {
  const cause = new TypeError("ECONNREFUSED");
  assertEquals(networkError(cause, "connect failed"), {
    kind: "network",
    cause,
    message: "connect failed",
  });
});

Deno.test("httpError omits requestId when not provided", () => {
  const e = httpError({ status: 500, statusText: "ISE", body: { msg: "x" } });
  assertEquals(e, {
    kind: "http",
    status: 500,
    statusText: "ISE",
    body: { msg: "x" },
  });
  assertEquals("requestId" in e, false);
});

Deno.test("httpError includes requestId when provided", () => {
  const e = httpError({
    status: 400,
    statusText: "Bad Request",
    body: null,
    requestId: "req-abc",
  });
  assertEquals(e.requestId, "req-abc");
});

Deno.test("validationError carries path, expected, got", () => {
  assertEquals(
    validationError({ path: ".choices[0]", expected: "object", got: null }),
    {
      kind: "validation",
      path: ".choices[0]",
      expected: "object",
      got: null,
    },
  );
});

Deno.test("streamError omits cause when not provided", () => {
  assertEquals(streamError({ reason: "parse" }), {
    kind: "stream",
    reason: "parse",
  });
});

Deno.test("streamError includes cause when provided", () => {
  const cause = new Error("bad frame");
  const e = streamError({ reason: "parse", cause });
  assertStrictEquals(e.cause, cause);
});

Deno.test("authError accepts forbidden reason for 403 responses", () => {
  assertEquals(authError({ reason: "forbidden", status: 403 }), {
    kind: "auth",
    reason: "forbidden",
    status: 403,
  });
});

Deno.test("authError omits status when not provided", () => {
  assertEquals(authError({ reason: "missing" }), {
    kind: "auth",
    reason: "missing",
  });
});

Deno.test("timeoutError carries ms", () => {
  assertEquals(timeoutError(60_000), { kind: "timeout", ms: 60_000 });
});

Deno.test("rateLimitedError pins status to 429", () => {
  const e = rateLimitedError({ retryAfterMs: 2000 });
  assertStrictEquals(e.status, 429);
  assertStrictEquals(e.retryAfterMs, 2000);
});

Deno.test("ApiError switch is exhaustive at compile time", () => {
  const describe = (e: ApiError): string => {
    switch (e.kind) {
      case "network":
        return "n";
      case "http":
        return "h";
      case "validation":
        return "v";
      case "stream":
        return "s";
      case "auth":
        return "a";
      case "timeout":
        return "t";
      case "rate-limited":
        return "r";
    }
  };
  assertStrictEquals(describe(networkError(new Error(), "")), "n");
  assertStrictEquals(
    describe(httpError({ status: 500, statusText: "x", body: null })),
    "h",
  );
  assertStrictEquals(describe(timeoutError(1)), "t");
  assertStrictEquals(describe(rateLimitedError({})), "r");
});

Deno.test("formatApiError renders each kind as a single-line summary", () => {
  assertStrictEquals(
    formatApiError(networkError(new Error("nope"), "no DNS")),
    "NetworkError: no DNS",
  );
  assertStrictEquals(
    formatApiError(httpError({ status: 404, statusText: "Not Found", body: {} })),
    "HttpError 404 Not Found",
  );
  assertStrictEquals(
    formatApiError(
      httpError({ status: 500, statusText: "Internal Server Error", body: {}, requestId: "r1" }),
    ),
    "HttpError 500 Internal Server Error (requestId=r1)",
  );
  assertStrictEquals(
    formatApiError(rateLimitedError({ retryAfterMs: 3000 })),
    "RateLimitedError: 429 retry-after=3000ms",
  );
  assertStrictEquals(formatApiError(timeoutError(5000)), "TimeoutError: exceeded 5000ms");
});

Deno.test("ApiError toString and Deno.inspect render the same summary", () => {
  const err = httpError({ status: 418, statusText: "I'm a teapot", body: {} });
  const summary = "HttpError 418 I'm a teapot";
  assertStrictEquals(String(err), summary);
  assertStrictEquals(Deno.inspect(err), summary);
});
