import type { ApiError } from "../error.ts";
import { networkError } from "../error.ts";
import type { ModelsWithMode } from "../models/mod.ts";
import type { Result } from "../result.ts";
import { err, ok, tryAsync } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Video bytes accepted for character creation. `Uint8Array`s are wrapped in a `Blob`. */
export type VideoFileInput = Blob | Uint8Array;

/** A single generated video record. */
export interface VideoObject {
  readonly id: string;
  readonly object: "video";
  readonly status: string;
  readonly created_at?: number;
  readonly completed_at?: number;
  readonly expires_at?: number;
  readonly error?: Readonly<Record<string, unknown>>;
  readonly progress?: number;
  readonly remixed_from_video_id?: string;
  readonly seconds?: string;
  readonly size?: string;
  readonly model?: string;
  readonly usage?: Readonly<Record<string, unknown>>;
}

/** Response from `GET /v1/videos`. */
export interface VideoListResponse {
  readonly data: readonly VideoObject[];
}

/** Request body for `POST /v1/videos`. */
export interface VideoGenerationRequest {
  readonly model: ModelsWithMode<"video_generation">;
  readonly prompt: string;
  readonly seconds?: string;
  readonly size?: string;
  readonly characters?: readonly Readonly<Record<string, string>>[];
  readonly user?: string;
  /** Provider-specific parameters passed through unmodified. */
  readonly parameters?: Readonly<Record<string, unknown>>;
}

/** Request body for `POST /v1/videos/{id}/remix`. */
export interface VideoRemixRequest {
  readonly prompt: string;
  readonly model?: ModelsWithMode<"video_generation">;
}

/** Request body for `POST /v1/videos/edits`. */
export interface VideoEditRequest {
  readonly prompt: string;
  /** Source video reference. Most providers accept `{ id: "video_..." }`. */
  readonly video: Readonly<Record<string, string>>;
  readonly model?: ModelsWithMode<"video_generation">;
}

/** Request body for `POST /v1/videos/extensions`. */
export interface VideoExtensionRequest {
  readonly prompt: string;
  readonly seconds: string;
  readonly video: Readonly<Record<string, string>>;
  readonly model?: ModelsWithMode<"video_generation">;
}

/** Request body for `POST /v1/videos/characters` (multipart). */
export interface CharacterCreateRequest {
  readonly name: string;
  readonly video: VideoFileInput;
  /** Filename attached to the multipart payload. Defaults to `"character.mp4"`. */
  readonly filename?: string;
  readonly model?: ModelsWithMode<"video_generation">;
}

/** A character generated from an uploaded video. */
export interface CharacterObject {
  readonly id: string;
  readonly object: "character";
  readonly created_at: number;
  readonly name: string;
}

/** Surface for video endpoints on the `Client`. */
export interface VideosNamespace {
  /** Submit a video generation job. Returns the video object (typically `queued`). */
  generate(req: VideoGenerationRequest): Promise<Result<VideoObject, ApiError>>;
  /** List videos. */
  list(): Promise<Result<VideoListResponse, ApiError>>;
  /** Retrieve a video by id. */
  retrieve(videoId: string): Promise<Result<VideoObject, ApiError>>;
  /** Download the raw bytes of a completed video. */
  content(videoId: string): Promise<Result<Uint8Array, ApiError>>;
  /** Remix an existing video. */
  remix(videoId: string, req: VideoRemixRequest): Promise<Result<VideoObject, ApiError>>;
  /** Submit a video-edit job. */
  edit(req: VideoEditRequest): Promise<Result<VideoObject, ApiError>>;
  /** Submit a video-extension job. */
  extend(req: VideoExtensionRequest): Promise<Result<VideoObject, ApiError>>;
  /** Submit a character creation job from an uploaded video (multipart). */
  createCharacter(req: CharacterCreateRequest): Promise<Result<CharacterObject, ApiError>>;
  /** Retrieve a character by id. */
  retrieveCharacter(characterId: string): Promise<Result<CharacterObject, ApiError>>;
}

const encode = (s: string) => encodeURIComponent(s);

const toBlob = (input: VideoFileInput): Blob =>
  input instanceof Blob ? input : new Blob([input as BlobPart]);

const buildCharacterForm = (req: CharacterCreateRequest): FormData => {
  const fd = new FormData();
  fd.append("video", toBlob(req.video), req.filename ?? "character.mp4");
  fd.append("name", req.name);
  if (req.model !== undefined) fd.append("model", req.model);
  return fd;
};

/** Bind a `VideosNamespace` to a constructed `Transport`. */
export const createVideos = (transport: Transport): VideosNamespace => ({
  generate(req) {
    return transport.request<VideoObject>({ method: "POST", path: "/v1/videos", body: req });
  },
  list() {
    return transport.request<VideoListResponse>({ method: "GET", path: "/v1/videos" });
  },
  retrieve(videoId) {
    return transport.request<VideoObject>({
      method: "GET",
      path: `/v1/videos/${encode(videoId)}`,
    });
  },
  async content(videoId) {
    const res = await transport.fetchRaw({
      method: "GET",
      path: `/v1/videos/${encode(videoId)}/content`,
    });
    if (!res.ok) return res;
    const bytes = await tryAsync(async () => new Uint8Array(await res.value.arrayBuffer()));
    if (!bytes.ok) {
      return err(networkError(bytes.error, "failed to read video response body"));
    }
    return ok(bytes.value);
  },
  remix(videoId, req) {
    return transport.request<VideoObject>({
      method: "POST",
      path: `/v1/videos/${encode(videoId)}/remix`,
      body: req,
    });
  },
  edit(req) {
    return transport.request<VideoObject>({
      method: "POST",
      path: "/v1/videos/edits",
      body: req,
    });
  },
  extend(req) {
    return transport.request<VideoObject>({
      method: "POST",
      path: "/v1/videos/extensions",
      body: req,
    });
  },
  createCharacter(req) {
    return transport.request<CharacterObject>({
      method: "POST",
      path: "/v1/videos/characters",
      body: buildCharacterForm(req),
    });
  },
  retrieveCharacter(characterId) {
    return transport.request<CharacterObject>({
      method: "GET",
      path: `/v1/videos/characters/${encode(characterId)}`,
    });
  },
});
