import type { ApiError } from "../error.ts";
import { networkError, streamError } from "../error.ts";
import type { ModelsWithMode } from "../models/mod.ts";
import type { Result } from "../result.ts";
import { err, ok, trySync } from "../result.ts";
import type { TransportConfig } from "../transport.ts";

/** Configuration for opening a realtime session. */
export interface RealtimeConnectOptions {
  /** Model to bind the session to. Must declare the `realtime` mode. */
  readonly model: ModelsWithMode<"realtime">;
  /**
   * Custom WebSocket constructor (defaults to the global `WebSocket`).
   * Injectable for testing or for runtimes that ship a different
   * constructor surface.
   */
  readonly websocket?: typeof WebSocket;
  /** Caller-supplied abort signal used to close the session early. */
  readonly signal?: AbortSignal;
}

/**
 * An event sent from the client to the server. The shape is intentionally
 * left open: the realtime protocol evolves rapidly and providers add new
 * event types. Discriminate on `type` and inspect the relevant fields.
 */
export interface RealtimeClientEvent {
  readonly type: string;
  readonly event_id?: string;
  readonly [key: string]: unknown;
}

/** An event received from the server. Same loose shape as the client event. */
export interface RealtimeServerEvent {
  readonly type: string;
  readonly event_id?: string;
  readonly [key: string]: unknown;
}

/** An open realtime session. */
export interface RealtimeSession {
  /**
   * Send a single client event. Returns an error if the session has already
   * closed or the event cannot be serialized.
   */
  send(event: RealtimeClientEvent): Result<undefined, ApiError>;
  /**
   * AsyncIterable of server-sent events. Yields per-event `Result`s; parse
   * failures and protocol errors surface as `kind: "stream"`. The iterable
   * terminates when the session closes for any reason.
   */
  readonly events: AsyncIterable<Result<RealtimeServerEvent, ApiError>>;
  /** Close the WebSocket gracefully. */
  close(): void;
}

const toWsUrl = (baseUrl: string, path: string): string => {
  const trimmed = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const url = new URL(`${trimmed}${path}`);
  if (url.protocol === "http:") url.protocol = "ws:";
  if (url.protocol === "https:") url.protocol = "wss:";
  return url.toString();
};

/** Surface for opening realtime sessions. */
export interface RealtimeNamespace {
  /**
   * Open a WebSocket session against `/v1/realtime`. Returns the session on
   * successful upgrade; returns a `network` error if the socket fails to
   * open.
   */
  connect(opts: RealtimeConnectOptions): Promise<Result<RealtimeSession, ApiError>>;
}

/** Build a `RealtimeNamespace` bound to a transport configuration. */
export const createRealtime = (config: TransportConfig): RealtimeNamespace => ({
  connect(opts) {
    const url = new URL(
      toWsUrl(config.baseUrl, `/v1/realtime?model=${encodeURIComponent(opts.model)}`),
    );

    const WS = opts.websocket ?? (globalThis.WebSocket as typeof WebSocket | undefined);
    if (WS === undefined) {
      return Promise.resolve(
        err(networkError(null, "WebSocket is not available in this runtime")),
      );
    }

    // The bearer token rides as a subprotocol entry, matching the convention
    // OpenAI's realtime API uses. The proxy reads it from the
    // Sec-WebSocket-Protocol handshake.
    const protocols = [
      "realtime",
      `openai-insecure-api-key.${config.apiKey}`,
    ];

    let ws: WebSocket;
    try {
      ws = new WS(url.toString(), protocols);
    } catch (caught) {
      return Promise.resolve(
        err(networkError(caught, "failed to construct WebSocket")),
      );
    }

    return new Promise<Result<RealtimeSession, ApiError>>((resolve) => {
      const queue: Array<Result<RealtimeServerEvent, ApiError>> = [];
      const waiters: Array<(v: IteratorResult<Result<RealtimeServerEvent, ApiError>>) => void> = [];
      let closed = false;
      let openResolved = false;

      const emit = (item: Result<RealtimeServerEvent, ApiError>) => {
        const waiter = waiters.shift();
        if (waiter === undefined) queue.push(item);
        else waiter({ value: item, done: false });
      };

      const finish = () => {
        closed = true;
        while (waiters.length > 0) {
          const waiter = waiters.shift()!;
          waiter({ value: undefined as never, done: true });
        }
      };

      ws.onopen = () => {
        if (openResolved) return;
        openResolved = true;
        resolve(ok(session));
      };

      ws.onmessage = (msg: MessageEvent) => {
        const text = typeof msg.data === "string"
          ? msg.data
          : (msg.data instanceof ArrayBuffer
            ? new TextDecoder().decode(new Uint8Array(msg.data))
            : "");
        if (text === "") return;
        const parsed = trySync<unknown>(() => JSON.parse(text));
        if (!parsed.ok) {
          emit(err(streamError({ reason: "parse", cause: parsed.error })));
          return;
        }
        emit(ok(parsed.value as RealtimeServerEvent));
      };

      ws.onerror = () => {
        if (!openResolved) {
          openResolved = true;
          resolve(err(networkError(null, "websocket failed to open")));
          return;
        }
        emit(err(streamError({ reason: "connection" })));
      };

      ws.onclose = () => {
        if (!openResolved) {
          openResolved = true;
          resolve(err(networkError(null, "websocket closed before opening")));
          return;
        }
        finish();
      };

      opts.signal?.addEventListener("abort", () => {
        try {
          ws.close();
        } catch {
          // ignore; ws is already closed or in an invalid state
        }
      });

      const session: RealtimeSession = {
        send(event) {
          if (closed) {
            return err(streamError({ reason: "connection" }));
          }
          const serialized = trySync(() => JSON.stringify(event));
          if (!serialized.ok) {
            return err(streamError({ reason: "parse", cause: serialized.error }));
          }
          try {
            ws.send(serialized.value);
            return ok(undefined);
          } catch (caught) {
            return err(networkError(caught, "websocket send failed"));
          }
        },
        events: {
          [Symbol.asyncIterator](): AsyncIterator<Result<RealtimeServerEvent, ApiError>> {
            return {
              next(): Promise<IteratorResult<Result<RealtimeServerEvent, ApiError>>> {
                const item = queue.shift();
                if (item !== undefined) {
                  return Promise.resolve({ value: item, done: false });
                }
                if (closed) {
                  return Promise.resolve({ value: undefined as never, done: true });
                }
                return new Promise((res) => waiters.push(res));
              },
              return(): Promise<IteratorResult<Result<RealtimeServerEvent, ApiError>>> {
                try {
                  ws.close();
                } catch {
                  // ignore
                }
                finish();
                return Promise.resolve({ value: undefined as never, done: true });
              },
            };
          },
        },
        close() {
          try {
            ws.close();
          } catch {
            // ignore
          }
        },
      };
    });
  },
});
