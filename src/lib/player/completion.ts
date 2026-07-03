export function shouldAutoComplete(currentTime: number, duration: number): boolean {
  if (!duration || duration <= 0) return false;
  return currentTime / duration >= 0.95;
}
