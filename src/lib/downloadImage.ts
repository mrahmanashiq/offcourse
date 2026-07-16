import { toPng } from "html-to-image";

// Render a DOM node to a PNG and trigger a download. Fully client-side (no
// network), so it works offline. pixelRatio 3 keeps text crisp when the sheet
// is rendered small on screen.
export async function downloadNodePng(node: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(node, { pixelRatio: 3, cacheBust: true });
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  a.click();
}
