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
