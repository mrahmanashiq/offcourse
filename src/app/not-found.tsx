import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <BrandMark className="size-12 text-xl" />
        <p className="text-6xl font-extrabold tracking-tight text-primary">404</p>
        <h1 className="text-lg font-bold">Page not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved. Your courses are safe.
        </p>
        <Button asChild className="mt-1"><Link href="/library">Back to your library</Link></Button>
      </div>
    </main>
  );
}
