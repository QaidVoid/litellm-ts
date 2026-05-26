import type { ApiError } from "../error.ts";
import type { ModelsWithMode } from "../models/mod.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Wire format for returned images. */
export type ImageResponseFormat = "url" | "b64_json";

/** Request body for `/v1/images/generations`. */
export interface ImageGenerationRequest {
  readonly model: ModelsWithMode<"image_generation">;
  /** Free-form text description of the image to generate. */
  readonly prompt: string;
  /** Number of images to generate. Provider-specific maximum. */
  readonly n?: number;
  /** Provider-specific size string (e.g. `"1024x1024"`). */
  readonly size?: string;
  /** Output fidelity. Higher levels cost more. */
  readonly quality?: "standard" | "hd";
  /** Artistic style hint. Only some providers honor it. */
  readonly style?: "vivid" | "natural";
  /** Whether `data[i]` contains a `url` or a base64-encoded `b64_json` payload. */
  readonly response_format?: ImageResponseFormat;
  /** Opaque caller identifier forwarded to upstream abuse-detection systems. */
  readonly user?: string;
}

/** A single generated image entry in the response. */
export interface ImageDatum {
  /** Direct URL to the rendered image. Set when `response_format` is `"url"`. */
  readonly url?: string;
  /** Base64-encoded image bytes. Set when `response_format` is `"b64_json"`. */
  readonly b64_json?: string;
  /** Prompt the upstream actually used after safety / rewriting passes. */
  readonly revised_prompt?: string;
}

/** A complete `/v1/images/generations` response. */
export interface ImageGenerationResponse {
  /** Unix timestamp (seconds) of generation. */
  readonly created: number;
  /** One entry per generated image, in order. */
  readonly data: readonly ImageDatum[];
}

/** Surface for the images endpoint on the `Client`. */
export interface ImagesNamespace {
  /** Generate one or more images from a text prompt. */
  generate(
    req: ImageGenerationRequest,
  ): Promise<Result<ImageGenerationResponse, ApiError>>;
}

/** Bind an `ImagesNamespace` to a constructed `Transport`. */
export const createImages = (transport: Transport): ImagesNamespace => ({
  generate(req) {
    return transport.request<ImageGenerationResponse>({
      method: "POST",
      path: "/v1/images/generations",
      body: req,
    });
  },
});
