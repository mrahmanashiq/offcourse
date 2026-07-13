import { auth } from "@/auth";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { DataModeInit } from "@/lib/data/DataModeInit";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // A session always means account mode; middleware guarantees anyone here
  // without one is in local mode (via the offcourse-mode cookie).
  const mode = session?.user?.id ? "account" : "local";
  return (
    <>
      <DataModeInit mode={mode} />
      <a href="#main" className="skip-link">Skip to content</a>
      {children}
      <CommandPalette />
      <KeyboardShortcuts />
    </>
  );
}
