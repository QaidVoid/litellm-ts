import type { ApiError } from "../error.ts";
import { networkError } from "../error.ts";
import type { ModelsWithMode } from "../models/mod.ts";
import type { Result } from "../result.ts";
import { err, ok, tryAsync } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Audio bytes accepted by `transcribe`. Uint8Arrays are wrapped in a `Blob`. */
export type AudioInput = Blob | Uint8Array;

/** Response format the upstream serializes a transcription in. */
export type TranscriptionFormat = "json" | "text" | "srt" | "verbose_json" | "vtt";

/** Request body for `/v1/audio/transcriptions`. */
export interface TranscriptionRequest {
  /** Transcription-capable model id. */
  readonly model: ModelsWithMode<"audio_transcription">;
  /** The audio bytes. Use a `Blob`/`File` to preserve mime type; `Uint8Array` is wrapped. */
  readonly file: AudioInput;
  /** Filename to attach in the multipart payload. Defaults to `"audio.bin"`. */
  readonly filename?: string;
  /** ISO-639-1 language code. Helps the model when the audio language is known. */
  readonly language?: string;
  /** Optional prompt that biases vocabulary or style. */
  readonly prompt?: string;
  /** Wire format of the returned transcription. Defaults to `"json"`. */
  readonly response_format?: TranscriptionFormat;
  /** Sampling temperature for the decoder. */
  readonly temperature?: number;
}

/** A `/v1/audio/transcriptions` response with `response_format: "json"` or `"verbose_json"`. */
export interface TranscriptionResponse {
  /** Decoded transcript. */
  readonly text: string;
}

/** Wire format of a synthesized speech response. */
export type SpeechFormat = "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";

/** Request body for `/v1/audio/speech`. */
export interface SpeechRequest {
  /** Speech-synthesis-capable model id. */
  readonly model: ModelsWithMode<"audio_speech">;
  /** Text to synthesize. */
  readonly input: string;
  /** Provider-specific voice identifier (e.g. `"alloy"`, `"echo"`, `"nova"`). */
  readonly voice: string;
  /** Encoding of the returned audio bytes. Defaults to `"mp3"`. */
  readonly response_format?: SpeechFormat;
  /** Speed multiplier (typical range 0.25 to 4.0). */
  readonly speed?: number;
}

/** Surface for audio endpoints on the `Client`. */
export interface AudioNamespace {
  /** Transcribe audio bytes. Returns at minimum the decoded `text`. */
  transcribe(
    req: TranscriptionRequest,
  ): Promise<Result<TranscriptionResponse, ApiError>>;
  /** Synthesize speech from text. Returns the raw audio bytes. */
  speak(req: SpeechRequest): Promise<Result<Uint8Array, ApiError>>;
}

const toBlob = (input: AudioInput): Blob =>
  input instanceof Blob ? input : new Blob([input as BlobPart]);

const buildTranscriptionForm = (req: TranscriptionRequest): FormData => {
  const fd = new FormData();
  fd.append("file", toBlob(req.file), req.filename ?? "audio.bin");
  fd.append("model", req.model);
  if (req.language !== undefined) fd.append("language", req.language);
  if (req.prompt !== undefined) fd.append("prompt", req.prompt);
  if (req.response_format !== undefined) fd.append("response_format", req.response_format);
  if (req.temperature !== undefined) fd.append("temperature", String(req.temperature));
  return fd;
};

/** Bind an `AudioNamespace` to a constructed `Transport`. */
export const createAudio = (transport: Transport): AudioNamespace => ({
  transcribe(req) {
    return transport.request<TranscriptionResponse>({
      method: "POST",
      path: "/v1/audio/transcriptions",
      body: buildTranscriptionForm(req),
    });
  },
  async speak(req) {
    const res = await transport.fetchRaw({
      method: "POST",
      path: "/v1/audio/speech",
      body: req,
    });
    if (!res.ok) return res;
    const bytes = await tryAsync(async () => new Uint8Array(await res.value.arrayBuffer()));
    if (!bytes.ok) {
      return err(
        networkError(bytes.error, "failed to read audio response body"),
      );
    }
    return ok(bytes.value);
  },
});
