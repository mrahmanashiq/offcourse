import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDebouncedCallback } from "../useDebouncedCallback";

describe("useDebouncedCallback", () => {
  it("calls once after the delay with the latest args", () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(spy, 500));
    result.current("a"); result.current("b");
    vi.advanceTimersByTime(499); expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("b");
    vi.useRealTimers();
  });
});
