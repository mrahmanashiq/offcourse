import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      {children}
      <CommandPalette />
      <KeyboardShortcuts />
    </>
  );
}
