"use client";
import { useRouter } from "next/navigation";
import { HardDrive } from "lucide-react";
import { LOCAL_MODE_COOKIE } from "@/lib/data/mode";
import { Button } from "@/components/ui/button";

// Enter local-only mode: set the cookie middleware reads, then go to the library.
export function LocalModeButton() {
  const router = useRouter();
  function useLocally() {
    document.cookie = `${LOCAL_MODE_COOKIE}=local; path=/; max-age=31536000; samesite=lax`;
    router.push("/library");
    router.refresh();
  }
  return (
    <Button variant="outline" size="lg" className="w-full" onClick={useLocally}>
      <HardDrive className="size-4" /> Use without an account
    </Button>
  );
}
