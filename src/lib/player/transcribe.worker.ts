/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference lib="webworker" />
import { pipeline, env } from "@huggingface/transformers";

// Fetch models from the HF CDN (cached by the browser after first use).
env.allowLocalModels = false;

let transcriber: any = null;

self.onmessage = async (e: MessageEvent) => {
  const { audio, model, language } = e.data as { audio: Float32Array; model: string; language?: string };
  try {
    if (!transcriber) {
      const progress_callback = (p: any) => {
        if (p?.status === "progress" && p?.file) {
          self.postMessage({ type: "progress", stage: "model", value: Math.round(p.progress ?? 0), file: p.file });
        }
      };
      const preferWebgpu = "gpu" in (self.navigator ?? {});
      try {
        transcriber = await pipeline("automatic-speech-recognition", model, { device: preferWebgpu ? "webgpu" : "wasm", progress_callback });
      } catch {
        transcriber = await pipeline("automatic-speech-recognition", model, { device: "wasm", progress_callback });
      }
    }
    self.postMessage({ type: "progress", stage: "transcribe" });
    const output: any = await transcriber(audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
      language: language || undefined,
    });
    self.postMessage({ type: "result", chunks: output.chunks ?? [{ timestamp: [0, null], text: output.text ?? "" }] });
  } catch (err) {
    transcriber = null;
    self.postMessage({ type: "error", message: (err as Error)?.message || "Transcription failed" });
  }
};
