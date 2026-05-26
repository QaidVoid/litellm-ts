import type { ApiError } from "../error.ts";
import type { ModelsWithMode } from "../models/mod.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Wire format for returned images. */
export type ImageResponseFormat = "url" | "b64_json";

/** Request body for `/v1/images/generations`. */
export interface ImageGenerationRequest {
  readonly model: ModelsWithMode<"image_generation">;
  readonly prompt: string;
  /** Number of images to generate. Provider-specific maximum. */
  readonly n?: number;
  /** Provider-specific size string (e.g. `"1024x1024"`). */
  readonly size?: string;
  readonly quality?: "standard" | "hd";
  readonly style?: "vivid" | "natural";
  readonly response_format?: ImageResponseFormat;
  readonly user?: string;
}

/** A single generated image entry in the response. */
export interface ImageDatum {
  readonly url?: string;
  readonly b64_json?: string;
  readonly revised_prompt?: string;
}

/** A complete `/v1/images/generations` response. */
export interface ImageGenerationResponse {
  readonly created: number;
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
