import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Full-viewport loader used by route loading.tsx boundaries and client data
// loaders. Fixed + centered so it sits dead-center every time and never jumps
// between the route boundary and the client loader.
export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Spinner className="size-7 text-primary" />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}
