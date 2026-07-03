export function isFileSystemAccessSupported(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof (globalThis as any).showDirectoryPicker === "function";
}
