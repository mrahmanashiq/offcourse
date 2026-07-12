import { CommandPalette } from "@/components/CommandPalette";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CommandPalette />
    </>
  );
}
