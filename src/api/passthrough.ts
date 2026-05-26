import type { ApiError } from "../error.ts";
import type { Result } from "../result.ts";
import type { RequestOptions, Transport } from "../transport.ts";

/**
 * Provider passthrough namespace. Each method mirrors the transport's own
 * `request`, `stream`, and `fetchRaw` methods, but the supplied `path` is
 * resolved under the provider's reserved prefix on the LiteLLM proxy
 * (e.g. `/anthropic`). Responses are the upstream provider's native shape,
 * not the OpenAI-normalized shape.
 */
export interface PassthroughNamespace {
  /** POST/GET/etc. and parse the JSON body as `TResp`. */
  request<TResp>(opts: RequestOptions): Promise<Result<TResp, ApiError>>;
  /**
   * Open a streaming response. Sets `accept: text/event-stream` and returns
   * the raw body for the caller to parse (likely with `parseSSE`).
   */
  stream(opts: RequestOptions): Promise<Result<ReadableStream<Uint8Array>, ApiError>>;
  /** Return the raw `Response` object. Useful for binary or unusual payloads. */
  fetchRaw(opts: RequestOptions): Promise<Result<Response, ApiError>>;
}

const joinPath = (prefix: string, path: string): string => {
  const stripped = path.startsWith("/") ? path.slice(1) : path;
  const sep = prefix.endsWith("/") ? "" : "/";
  return `${prefix}${sep}${stripped}`;
};

/** Build a passthrough namespace bound to a single provider prefix. */
export const createPassthrough = (
  transport: Transport,
  prefix: string,
): PassthroughNamespace => ({
  request(opts) {
    return transport.request({ ...opts, path: joinPath(prefix, opts.path) });
  },
  stream(opts) {
    return transport.stream({ ...opts, path: joinPath(prefix, opts.path) });
  },
  fetchRaw(opts) {
    return transport.fetchRaw({ ...opts, path: joinPath(prefix, opts.path) });
  },
});
