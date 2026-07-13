import { cn } from "@/lib/utils";

// The Offcourse "O" mark — matches the PWA icon / offline page.
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-lg bg-primary font-extrabold leading-none text-primary-foreground", className)}
      aria-hidden="true"
    >
      O
    </span>
  );
}
