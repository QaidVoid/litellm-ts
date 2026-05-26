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
  ChatRequestBaseCore,
  ChatRequestBaseTextOnly,
  ChatResponseFormat,
  ChatSystemMessage,
  ChatTextOnlyMessage,
  ChatTextOnlyUserMessage,
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
  CompletionChoice,
  CompletionChunk,
  CompletionFinishReason,
  CompletionLogProbs,
  CompletionRequest,
  CompletionResponse,
  CompletionsNamespace,
  CompletionUsage,
} from "./src/api/completions.ts";

export type {
  DeleteResponseResponse,
  ListResponsesQuery,
  ListResponsesResponse,
  ResponsesContentPart,
  ResponsesCreateRequest,
  ResponsesInput,
  ResponsesInputMessage,
  ResponsesNamespace,
  ResponsesOutputItem,
  ResponsesReasoning,
  ResponsesResponse,
  ResponsesStreamEvent,
  ResponsesTool,
  ResponsesToolChoice,
  ResponsesUsage,
} from "./src/api/responses.ts";

export type {
  AttachVectorStoreFileRequest,
  CreateVectorStoreRequest,
  DeleteVectorStoreFileResponse,
  DeleteVectorStoreResponse,
  ListVectorStoreFilesResponse,
  ListVectorStoresQuery,
  ListVectorStoresResponse,
  UpdateVectorStoreRequest,
  VectorStore,
  VectorStoreChunkingStrategy,
  VectorStoreExpiration,
  VectorStoreFile,
  VectorStoreFileCounts,
  VectorStoresNamespace,
} from "./src/api/vector_stores.ts";

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
  ImageEditRequest,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageInput,
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
  Batch,
  BatchCompletionWindow,
  BatchCreateRequest,
  BatchEndpoint,
  BatchErrorObject,
  BatchesNamespace,
  BatchRequestCounts,
  BatchStatus,
  ListBatchesQuery,
  ListBatchesResponse,
} from "./src/api/batches.ts";

export type {
  FineTuningCreateRequest,
  FineTuningError,
  FineTuningHyperparameters,
  FineTuningIntegration,
  FineTuningJob,
  FineTuningJobEvent,
  FineTuningJobStatus,
  FineTuningNamespace,
  ListFineTuningEventsQuery,
  ListFineTuningEventsResponse,
  ListFineTuningJobsQuery,
  ListFineTuningJobsResponse,
} from "./src/api/fine_tuning.ts";

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
  DeleteModelRequest,
  DeleteModelResponse,
  ListModelsResponse,
  LiteLLMParams,
  ProxyModel,
  ProxyModelInfo,
  ProxyModelsNamespace,
  RegisterModelRequest,
  UpdateModelRequest,
} from "./src/api/admin/models.ts";

export type {
  AddTeamMemberRequest,
  CreateTeamRequest,
  DeleteTeamMemberRequest,
  DeleteTeamsRequest,
  ListTeamsResponse,
  Team,
  TeamBudgetLimit,
  TeamIdRequest,
  TeamMemberRole,
  TeamMembership,
  TeamMemberSpec,
  TeamModelsRequest,
  TeamsNamespace,
  UpdateTeamMemberRequest,
  UpdateTeamRequest,
} from "./src/api/admin/teams.ts";

export type {
  CreateUserRequest,
  DeleteUsersRequest,
  ListUsersQuery,
  ListUsersResponse,
  UpdateUserRequest,
  User,
  UserRole,
  UsersNamespace,
  UserTeamMembership,
} from "./src/api/admin/users.ts";

export type {
  CalculateSpendRequest,
  CalculateSpendResponse,
  SpendLog,
  SpendLogsQuery,
  SpendLogsResponse,
  SpendNamespace,
  SpendTagBucket,
  SpendTagsQuery,
  SpendTagsResponse,
} from "./src/api/admin/spend.ts";

export type {
  Budget,
  BudgetsNamespace,
  CreateBudgetRequest,
  DeleteBudgetRequest,
  ListBudgetsResponse,
  ModelBudget,
  UpdateBudgetRequest,
} from "./src/api/admin/budgets.ts";

export type { PassthroughNamespace } from "./src/api/passthrough.ts";

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
