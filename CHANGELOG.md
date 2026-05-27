## 0.1.0 — 2026-05-27

### Bug Fixes

- Correct team member endpoint paths to underscore form

### Documentation

- List newly added namespaces in README
- Add uniform JSDoc to public interface fields
- List new namespaces in README
- List realtime in README
- List organizations, callbacks, guardrails, cache, config in README
- Refresh README
- List moderation and files in README endpoint table
- Add setup-models example for proxy admin /model/new
- Add README with quickstart, errors, and capability gating
- Add runnable examples
- Add per-field JSDoc on public request and response types

### Features

- Add projects + audit namespaces, container files; remove two phantoms
- Align proxy response shapes and add customModel escape hatch
- Add debug namespace + health.test/routes + cache.redisInfo
- Fill all remaining proxy endpoint gaps
- Add memory, public, and spendConnectors namespaces
- Fill remaining sub-op gaps across existing namespaces
- Add utils namespace
- Add policies and workflows namespaces
- Add assistants/threads and prompts namespaces
- Expand teams sub-ops
- Expand guardrails and config admin namespaces
- Add googleGenai, anthropicSkills, and claudeCode namespaces
- Add agents and search namespaces
- Add credentials, ocr, rag, containers, and evals namespaces
- Add messages.countTokens and vectorStores.fileContent
- Add SCIM v2 admin namespace
- Add MCP admin namespace and multi-value query support
- Add videos endpoint with mode-gated model
- Add admin tools (policy registry) namespace
- Add admin router, access groups, jwt mappings, and compliance namespaces
- Add admin fallbacks namespace
- Add admin tags namespace
- Add admin customers namespace
- Add realtime WebSocket client
- Add admin cache and config namespaces
- Add admin callbacks and guardrails namespaces
- Add admin organizations namespace
- Add vector stores endpoint
- Add OpenAI Responses API
- Gate image content on chat messages by vision capability
- Add provider passthrough namespaces
- Add legacy completions endpoint
- Add image edits endpoint
- Add fine-tuning jobs API
- Add batches API
- Add admin spend and budgets namespaces
- Add admin users namespace
- Add admin teams namespace
- Add admin proxyModels namespace
- Add admin keys namespace
- Add health admin endpoints (liveliness, readiness, test_connection)
- Add files API for upload, list, retrieve, delete, content
- Add moderation endpoint
- Preserve response body on AuthError for upstream debugging
- Add Anthropic-shape messages endpoint with streaming
- Add rerank endpoint
- Add audio transcription and speech endpoints
- Support FormData body and add fetchRaw to transport
- Add image generation endpoint
- Add embeddings endpoint with mode-narrowed model
- Emit ModelsByMode in generated registry
- Gate tool fields on function_calling capability
- Add streaming chat completions
- Add chat completions endpoint and Client surface
- Add hand-rolled SSE parser
- Add typed HTTP transport with retry and timeout
- Add capability-narrowed model registry
- Add Result type and ApiError discriminated union

### Refactor

- Encode proxy validators as discriminated unions

### Tests

- Drive e2e method coverage to 99.1% (383 tests)
- Drive e2e method coverage to ~95% (373 tests)
- E2e coverage across every SDK namespace; narrow models on ctx
- Expand e2e coverage across admin, inference, and read-only namespaces
- Add committable e2e suite under tests/e2e/
