"use client";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CommandSearchButton() {
  return (
    <Button
      variant="outline"
      onClick={() => window.dispatchEvent(new Event("offcourse:open-command"))}
      aria-label="Search"
    >
      <Search className="size-4" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="ml-1 hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">⌘K</kbd>
    </Button>
  );
}
