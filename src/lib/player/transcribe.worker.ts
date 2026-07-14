/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference lib="webworker" />
import { pipeline, env } from "@huggingface/transformers";

// Fetch models from the HF CDN (cached by the browser after first use).
env.allowLocalModels = false;

let transcriber: any = null;

// Only use WebGPU if a real adapter is available; otherwise a webgpu pipeline
// fails at inference ("Failed to get GPU adapter"). Fall back to WASM (q8).
async function pickDevice(): Promise<"webgpu" | "wasm"> {
  try {
    const gpu = (self.navigator as any)?.gpu;
    if (gpu?.requestAdapter) {
      const adapter = await gpu.requestAdapter();
      if (adapter) return "webgpu";
    }
  } catch { /* no webgpu */ }
  return "wasm";
}

self.onmessage = async (e: MessageEvent) => {
  const { audio, model, language } = e.data as { audio: Float32Array; model: string; language?: string };
  try {
    if (!transcriber) {
      const progress_callback = (p: any) => {
        if (p?.status === "progress" && p?.file) {
          self.postMessage({ type: "progress", stage: "model", value: Math.round(p.progress ?? 0), file: p.file });
        }
      };
      const device = await pickDevice();
      try {
        transcriber = await pipeline("automatic-speech-recognition", model, { device, dtype: device === "webgpu" ? "fp32" : "q8", progress_callback });
      } catch {
        transcriber = await pipeline("automatic-speech-recognition", model, { device: "wasm", dtype: "q8", progress_callback });
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
