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
  ModelsByMode,
  ModelsWithCapability,
  ModelsWithMode,
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
  ChatRequestBase,
  ChatResponseFormat,
  ChatSystemMessage,
  ChatTextPart,
  ChatTool,
  ChatToolCall,
  ChatToolChoice,
  ChatToolFields,
  ChatToolMessage,
  ChatUsage,
  ChatUserContentPart,
  ChatUserMessage,
} from "./src/api/chat.ts";

export type {
  EmbeddingsDatum,
  EmbeddingsEncoding,
  EmbeddingsInput,
  EmbeddingsNamespace,
  EmbeddingsRequest,
  EmbeddingsResponse,
  EmbeddingsUsage,
} from "./src/api/embeddings.ts";

export type {
  ImageDatum,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageResponseFormat,
  ImagesNamespace,
} from "./src/api/images.ts";

export type {
  AudioInput,
  AudioNamespace,
  SpeechFormat,
  SpeechRequest,
  TranscriptionFormat,
  TranscriptionRequest,
  TranscriptionResponse,
} from "./src/api/audio.ts";

export type {
  RerankMeta,
  RerankNamespace,
  RerankRequest,
  RerankResponse,
  RerankResult,
} from "./src/api/rerank.ts";

export type {
  ModerationCategoryFlags,
  ModerationCategoryScores,
  ModerationInput,
  ModerationNamespace,
  ModerationRequest,
  ModerationResponse,
  ModerationResult,
} from "./src/api/moderation.ts";

export type {
  FileCreateRequest,
  FileDeleteResponse,
  FileListQuery,
  FileListResponse,
  FileObject,
  FilePurpose,
  FilesNamespace,
  FileStatus,
  FileUpload,
} from "./src/api/files.ts";

export type {
  DatabaseStatus,
  HealthNamespace,
  ReadinessDetailsResponse,
  ReadinessResponse,
  ReadinessStatus,
  TestConnectionRequest,
  TestConnectionResponse,
} from "./src/api/admin/health.ts";

export type {
  DeleteKeysRequest,
  DeleteKeysResponse,
  GenerateKeyRequest,
  KeyHealthResponse,
  KeyMetadata,
  KeysNamespace,
  KeyTokenRequest,
  KeyType,
  LimitType,
  ListKeysQuery,
  ListKeysResponse,
  RegenerateKeyRequest,
  UpdateKeyRequest,
} from "./src/api/admin/keys.ts";

export type {
  MessagesContentBlock,
  MessagesImageBlock,
  MessagesMessage,
  MessagesNamespace,
  MessagesRequest,
  MessagesResponse,
  MessagesStopReason,
  MessagesStreamEvent,
  MessagesTextBlock,
  MessagesThinkingBlock,
  MessagesTool,
  MessagesToolChoice,
  MessagesToolResultBlock,
  MessagesToolUseBlock,
  MessagesUsage,
} from "./src/api/messages.ts";

export type { Client } from "./src/client.ts";
export { createClient } from "./src/client.ts";
