import { describe, it, expect, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
import { auth } from "@/auth";
import { requireUserId } from "@/lib/requireUserId";

describe("requireUserId", () => {
  it("returns the session user id", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    expect(await requireUserId()).toBe("u1");
  });
  it("throws when unauthenticated", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth as any).mockResolvedValue(null);
    await expect(requireUserId()).rejects.toThrow("UNAUTHENTICATED");
  });
});
