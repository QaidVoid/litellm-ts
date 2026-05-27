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
  RealtimeClientEvent,
  RealtimeConnectOptions,
  RealtimeNamespace,
  RealtimeServerEvent,
  RealtimeSession,
} from "./src/api/realtime.ts";

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
  VectorStoreFileContentChunk,
  VectorStoreFileContentResponse,
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
  CharacterCreateRequest,
  CharacterObject,
  VideoEditRequest,
  VideoExtensionRequest,
  VideoFileInput,
  VideoGenerationRequest,
  VideoListResponse,
  VideoObject,
  VideoRemixRequest,
  VideosNamespace,
} from "./src/api/videos.ts";

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
  KeyTempBudgetBump,
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
  AddTeamCallbackRequest,
  AddTeamMemberRequest,
  BulkAddTeamMembersRequest,
  BulkAddTeamMembersResponse,
  BulkTeamMemberAddResult,
  BulkUpdateTeamMemberPermissionsRequest,
  BulkUpdateTeamMemberPermissionsResponse,
  CreateTeamRequest,
  DeleteTeamMemberRequest,
  DeleteTeamsRequest,
  ListTeamsResponse,
  MemberIdentity,
  Team,
  TeamBudgetLimit,
  TeamCallbacksResponse,
  TeamDailyActivityQuery,
  TeamIdRequest,
  TeamMemberMeResponse,
  TeamMemberPermissionsResponse,
  TeamMemberRole,
  TeamMembership,
  TeamMemberSpec,
  TeamModelsRequest,
  TeamsNamespace,
  UpdateTeamMemberPermissionsRequest,
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
  SpendCompletionResponse,
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

export type {
  BlockCustomersRequest,
  CreateCustomerRequest,
  Customer,
  CustomerBaseFields,
  CustomerBudgetBinding,
  CustomerObjectPermission,
  CustomerRegion,
  CustomersNamespace,
  DeleteCustomersRequest,
  UpdateCustomerRequest,
} from "./src/api/admin/customers.ts";

export type {
  CreateTagRequest,
  DeleteTagRequest,
  ListTagsQuery,
  TagConfig,
  TagInfoRequest,
  TagsNamespace,
  UpdateTagRequest,
} from "./src/api/admin/tags.ts";

export type {
  FallbackCreateRequest,
  FallbackDeleteResponse,
  FallbackGetResponse,
  FallbackResponse,
  FallbacksNamespace,
  FallbackType,
} from "./src/api/admin/fallbacks.ts";

export type {
  RouterFieldsResponse,
  RouterNamespace,
  RouterSettingsField,
  RouterSettingsResponse,
} from "./src/api/admin/router.ts";

export type {
  AccessGroup,
  AccessGroupsNamespace,
  CreateAccessGroupRequest,
  UpdateAccessGroupRequest,
} from "./src/api/admin/access_groups.ts";

export type {
  CreateJwtMappingRequest,
  DeleteJwtMappingRequest,
  JwtMapping,
  JwtMappingsNamespace,
  ListJwtMappingsQuery,
  ListJwtMappingsResponse,
  UpdateJwtMappingRequest,
} from "./src/api/admin/jwt_mappings.ts";

export type {
  ComplianceCheckRequest,
  ComplianceCheckResult,
  ComplianceNamespace,
  ComplianceResponse,
} from "./src/api/admin/compliance.ts";

export type {
  DeleteToolOverrideScope,
  ListToolsQuery,
  ToolDetailResponse,
  ToolInputPolicy,
  ToolListResponse,
  ToolLogsQuery,
  ToolOutputPolicy,
  ToolPolicyOption,
  ToolPolicyOptionsResponse,
  ToolPolicyOverride,
  ToolRow,
  ToolsNamespace,
  ToolUsageLogEntry,
  ToolUsageLogsResponse,
  UpdateToolPolicyRequest,
  UpdateToolPolicyResponse,
  UpdateToolPolicyScope,
} from "./src/api/admin/tools.ts";

export type {
  CreateMcpServerRequest,
  CreateMcpToolsetRequest,
  ListMcpServersQuery,
  MakeMcpServersPublicRequest,
  MakeMcpServersPublicResponse,
  McpAuthConfig,
  McpAuthType,
  McpCredentials,
  McpDiscoverQuery,
  McpDiscoverResponse,
  McpNamespace,
  McpOauth2Flow,
  McpServer,
  McpServerCommonFields,
  McpServerHealthQuery,
  McpServerHealthRow,
  McpServersNamespace,
  McpSubmissionsResponse,
  McpToolset,
  McpToolsetsNamespace,
  McpToolsetTool,
  McpTransport,
  McpTransportConfig,
  UpdateMcpServerRequest,
  UpdateMcpToolsetRequest,
} from "./src/api/admin/mcp.ts";

export type {
  ScimFeature,
  ScimGroup,
  ScimGroupsNamespace,
  ScimListQuery,
  ScimListResponse,
  ScimMember,
  ScimNamespace,
  ScimPatchOp,
  ScimPatchOperation,
  ScimResource,
  ScimResourceType,
  ScimSchema,
  ScimSchemaAttribute,
  ScimServiceProviderConfig,
  ScimUser,
  ScimUserEmail,
  ScimUserGroup,
  ScimUserName,
  ScimUsersNamespace,
} from "./src/api/admin/scim.ts";

export type {
  CreateCredentialRequest,
  Credential,
  CredentialMutationResponse,
  CredentialsNamespace,
  CredentialValuesSource,
  ListCredentialsResponse,
  UpdateCredentialRequest,
} from "./src/api/admin/credentials.ts";

export type {
  Container,
  ContainerExpiration,
  ContainersNamespace,
  CreateContainerRequest,
  DeleteContainerResponse,
  ListContainersQuery,
  ListContainersResponse,
} from "./src/api/containers.ts";

export type {
  CancelEvalResponse,
  CancelEvalRunResponse,
  CreateEvalRequest,
  CreateEvalRunRequest,
  DeleteEvalResponse,
  DeleteEvalRunResponse,
  Eval,
  EvalDataSourceConfig,
  EvalGraderConfig,
  EvalRun,
  EvalRunDataSource,
  EvalRunsNamespace,
  EvalsNamespace,
  ListEvalRunsQuery,
  ListEvalRunsResponse,
  ListEvalsQuery,
  ListEvalsResponse,
  PerTestingCriteriaResult,
  UpdateEvalRequest,
  UpdateEvalRunRequest,
} from "./src/api/evals.ts";

export type {
  OcrDocument,
  OcrFileInput,
  OcrFileRequest,
  OcrNamespace,
  OcrPage,
  OcrPageDimensions,
  OcrPageImage,
  OcrRequest,
  OcrResponse,
  OcrUsageInfo,
} from "./src/api/ocr.ts";

export type {
  RagBedrockVectorStoreOptions,
  RagChunkingStrategy,
  RagIngestEmbeddingOptions,
  RagIngestOcrOptions,
  RagIngestOptions,
  RagIngestRequest,
  RagIngestResponse,
  RagIngestSource,
  RagInlineFile,
  RagNamespace,
  RagOpenAIVectorStoreOptions,
  RagQueryRequest,
  RagQueryResponse,
  RagRerankConfig,
  RagRetrievalConfig,
  RagS3VectorsVectorStoreOptions,
  RagVectorStoreOptions,
  RagVertexAIVectorStoreOptions,
} from "./src/api/rag.ts";

export type {
  A2aSendMessageRequest,
  A2aSendMessageResponse,
  Agent,
  AgentCapabilities,
  AgentCard,
  AgentObjectPermission,
  AgentSkill,
  AgentsNamespace,
  CreateAgentRequest,
  ListAgentsQuery,
  MakeAgentsPublicRequest,
  MakeAgentsPublicResponse,
  PatchAgentRequest,
  UpdateAgentRequest,
} from "./src/api/agents.ts";

export type {
  AvailableSearchProvider,
  AvailableSearchProvidersResponse,
  CreateSearchToolRequest,
  ListSearchToolsResponse,
  SearchNamespace,
  SearchRequest,
  SearchResponse,
  SearchTool,
  SearchToolInfo,
  SearchToolLiteLLMParams,
  SearchToolsNamespace,
  TestSearchToolConnectionRequest,
  UpdateSearchToolRequest,
} from "./src/api/search.ts";

export type {
  CountTokensRequest,
  CountTokensResponse,
  CreateInteractionRequest,
  DeleteGoogleAgentResponse,
  GenerateContentChunk,
  GenerateContentRequest,
  GenerateContentResponse,
  GoogleAgent,
  GoogleAgentCreateRequest,
  GoogleAgentsNamespace,
  GoogleGenaiNamespace,
  GoogleInteractionsNamespace,
  Interaction,
  ListAgentVersionsResponse,
  ListGoogleAgentsQuery,
  ListGoogleAgentsResponse,
} from "./src/api/google_genai.ts";

export type {
  AnthropicSkillsNamespace,
  CreateSkillRequest,
  DeleteSkillResponse,
  ListSkillsQuery,
  ListSkillsResponse,
  Skill,
  SkillFileInput,
} from "./src/api/anthropic_skills.ts";

export type {
  ClaudeCodeMutationResponse,
  ClaudeCodeNamespace,
  ListPluginsResponse,
  MarketplacePluginEntry,
  MarketplaceResponse,
  PluginAuthor,
  PluginInfo,
  PluginListItem,
  PluginOwner,
  PluginSource,
  RegisterPluginRequest,
  RegisterPluginResponse,
} from "./src/api/claude_code.ts";

export type {
  AddOrganizationMemberRequest,
  CreateOrganizationRequest,
  DeleteOrganizationMemberRequest,
  DeleteOrganizationsRequest,
  ListOrganizationsResponse,
  Organization,
  OrganizationMemberRole,
  OrganizationMemberSpec,
  OrganizationsNamespace,
  UpdateOrganizationMemberRequest,
  UpdateOrganizationRequest,
} from "./src/api/admin/organizations.ts";

export type {
  CallbackHealthResponse,
  CallbackInfo,
  CallbacksNamespace,
  CallbackStatus,
  ListCallbacksResponse,
  UpdateCallbacksRequest,
} from "./src/api/admin/callbacks.ts";

export type {
  ApplyGuardrailRequest,
  ApplyGuardrailResponse,
  CreateGuardrailRequest,
  Guardrail,
  GuardrailDefinitionLocation,
  GuardrailInfo,
  GuardrailLitellmParams,
  GuardrailMode,
  GuardrailsNamespace,
  GuardrailSubmissionsNamespace,
  GuardrailUsageDetailResponse,
  GuardrailUsageLogEntry,
  GuardrailUsageLogsQuery,
  GuardrailUsageLogsResponse,
  GuardrailUsageNamespace,
  GuardrailUsageOverviewResponse,
  GuardrailUsageOverviewRow,
  GuardrailUsageQuery,
  ListGuardrailsResponse,
  ListGuardrailSubmissionsQuery,
  PatchGuardrailRequest,
  RegisterGuardrailRequest,
  TestCustomCodeGuardrailRequest,
  TestCustomCodeGuardrailResponse,
  UpdateGuardrailRequest,
  ValidateBlockedWordsFileRequest,
  ValidateBlockedWordsFileResponse,
} from "./src/api/admin/guardrails.ts";

export type {
  CacheDeleteRequest,
  CacheNamespace,
  CachePingResponse,
} from "./src/api/admin/cache.ts";

export type {
  CallbackDelete,
  ConfigCostDiscountsNamespace,
  ConfigCostMarginsNamespace,
  ConfigFieldDelete,
  ConfigFieldEntry,
  ConfigFieldsNamespace,
  ConfigFieldUpdate,
  ConfigNamespace,
  ConfigNestedFieldDetail,
  ConfigPassThroughEndpointsNamespace,
  ConfigSectionType,
  CostDiscountConfig,
  CostDiscountConfigResponse,
  CostMarginConfig,
  CostMarginConfigResponse,
  ListPassThroughEndpointsQuery,
  ListPassThroughEndpointsResponse,
  PassThroughEndpoint,
  PassThroughEndpointSettings,
  ProxyConfigSnapshot,
  UpdateConfigRequest,
} from "./src/api/admin/config.ts";

export type { PassthroughNamespace } from "./src/api/passthrough.ts";

export type {
  MessagesContentBlock,
  MessagesCountTokensRequest,
  MessagesCountTokensResponse,
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
