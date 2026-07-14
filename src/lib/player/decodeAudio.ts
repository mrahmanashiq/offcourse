// Decode a video/audio File to 16 kHz mono PCM (Float32) for Whisper.
// Runs on the main thread (Web Audio); the heavy ML work happens in a worker.
export async function decodeAudioTo16kMono(file: File): Promise<Float32Array> {
  const AC = window.AudioContext;
  if (!AC) throw new Error("Web Audio is not supported in this browser.");
  const buf = await file.arrayBuffer();
  const ctx = new AC();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(buf);
  } finally {
    ctx.close();
  }
  if (!decoded.duration) throw new Error("No audio track found in this file.");

  const rate = 16000;
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}
