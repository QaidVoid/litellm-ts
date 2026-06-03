/**
 * Shared helpers for the api-module unit tests. These tests assert how each
 * namespace method shapes its request (method, path, query, body) against a
 * recording `fetch`, with no network. Not part of the published package: it is
 * imported only by `*_test.ts` files, which dnt excludes from the build.
 */

import type { Client } from "../client.ts";
import { createClient } from "../client.ts";

/** A recorded outbound fetch call. */
export interface FetchCall {
  readonly input: string | URL | Request;
  readonly init: RequestInit | undefined;
}

/** A `fetch` stub that records calls and replays queued responses in order. */
export const recordingFetch = (
  responses: ReadonlyArray<() => Response | Promise<Response>>,
): { fetch: typeof fetch; calls: FetchCall[] } => {
  const calls: FetchCall[] = [];
  let i = 0;
  const fetchFn: typeof fetch = (input, init) => {
    calls.push({ input, init });
    const make = responses[i++];
    if (make === undefined) throw new Error(`mock fetch exhausted at call ${i}`);
    return Promise.resolve(make());
  };
  return { fetch: fetchFn, calls };
};

/** Build a JSON `Response`. */
export const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/** A client whose fetch returns `body` once; returns the client and the call log. */
export const clientReturning = (
  body: unknown,
  status = 200,
): { client: Client; calls: FetchCall[] } => {
  const { fetch, calls } = recordingFetch([() => jsonResponse(body, status)]);
  return { client: testClient(fetch), calls };
};

/** A client bound to a specific recording `fetch`. */
export const testClient = (fetchFn: typeof fetch): Client =>
  createClient({ baseUrl: "https://api.test", apiKey: "test", maxRetries: 0, fetch: fetchFn });

/** Parsed view of a recorded call: method, path, query params, and JSON body. */
export interface RecordedRequest {
  readonly method: string | undefined;
  readonly pathname: string;
  readonly search: URLSearchParams;
  // deno-lint-ignore no-explicit-any
  readonly body: any;
}

/** Decode the `i`-th recorded call into method/path/query/body. */
export const recorded = (calls: readonly FetchCall[], i = 0): RecordedRequest => {
  const call = calls[i];
  if (call === undefined) throw new Error(`no recorded call at index ${i}`);
  const url = new URL(call.input as string);
  const rawBody = call.init?.body;
  return {
    method: call.init?.method,
    pathname: url.pathname,
    search: url.searchParams,
    body: typeof rawBody === "string" && rawBody.length > 0 ? JSON.parse(rawBody) : undefined,
  };
};
