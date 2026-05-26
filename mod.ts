export type {
  ApiError,
  ApiErrorKind,
  AuthError,
  HttpError,
  NetworkError,
  RateLimitedError,
  StreamError,
  TimeoutError,
  ValidationError,
} from "./src/error.ts";

export {
  authError,
  httpError,
  networkError,
  rateLimitedError,
  streamError,
  timeoutError,
  validationError,
} from "./src/error.ts";

export type { Result } from "./src/result.ts";

export {
  andThen,
  err,
  isErr,
  isOk,
  map,
  mapErr,
  match,
  ok,
  tryAsync,
  trySync,
  unwrapOr,
} from "./src/result.ts";

export type {
  Capability,
  Mode,
  ModelEntry,
  ModelId,
  ModelsByCapability,
  ModelsWithCapability,
  Provider,
} from "./src/models/mod.ts";

export { MODELS } from "./src/models/mod.ts";

export type { HttpMethod, RequestOptions, Transport, TransportConfig } from "./src/transport.ts";

export { createTransport } from "./src/transport.ts";

export type { SSEEvent } from "./src/sse.ts";

export { parseSSE } from "./src/sse.ts";

export type {
  ChatAssistantMessage,
  ChatChoice,
  ChatChunkChoice,
  ChatChunkToolCall,
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatFinishReason,
  ChatImageUrlPart,
  ChatMessage,
  ChatNamespace,
  ChatResponseFormat,
  ChatSystemMessage,
  ChatTextPart,
  ChatTool,
  ChatToolCall,
  ChatToolChoice,
  ChatToolMessage,
  ChatUsage,
  ChatUserContentPart,
  ChatUserMessage,
} from "./src/api/chat.ts";

export type { Client } from "./src/client.ts";
export { createClient } from "./src/client.ts";
