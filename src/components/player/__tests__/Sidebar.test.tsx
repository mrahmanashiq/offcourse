import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "../Sidebar";
import type { CourseTree } from "@/lib/course/types";

const tree: CourseTree = { title: "T", modules: [
  { title: "2. Tense", lessons: [{ key: "k1", title: "1. Basics.mp4", relPath: "2. Tense/1. Basics.mp4", kind: "video" }] },
]};

describe("Sidebar", () => {
  it("renders modules, lessons, a per-section count, and a completion check", () => {
    render(<Sidebar tree={tree} progress={{ k1: { positionSeconds: 0, completed: true } }} activeKey="k1" onSelect={vi.fn()} />);
    expect(screen.getByText("2. Tense")).toBeInTheDocument();
    expect(screen.getByText("1. Basics.mp4")).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument(); // per-section completed count
    expect(screen.getByLabelText("completed")).toBeInTheDocument();
  });
});
