import { Play, FileText, ArrowRight, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

// The signature: a raw download folder (monospace file dump) transformed into
// the actual Offcourse course sidebar. The course rows assemble in on load.
const rawFiles = [
  "01 Reasoning Models.mp4",
  "02 Chain of Thought.mp4",
  "03 Tools used by LLMs.mp4",
  "04 Context Engineering.mp4",
  "slides.pdf",
];

const lessons = [
  { n: 1, title: "Reasoning Models", kind: "video", active: true },
  { n: 2, title: "Chain of Thought", kind: "video", active: false },
  { n: 3, title: "Tools used by LLMs", kind: "video", active: false },
  { n: 4, title: "Context Engineering", kind: "video", active: false },
  { n: 5, title: "Slides & resources", kind: "pdf", active: false },
] as const;

export function HeroShowcase() {
  return (
    <div className="relative mx-auto mt-16 max-w-4xl px-1">
      <div
        aria-hidden
        className="animate-aurora pointer-events-none absolute left-1/2 top-[-40px] -z-10 h-56 w-[80%] rounded-full bg-primary/20 blur-[90px]"
      />
      <div className="grid items-center gap-3 rounded-2xl border border-border bg-card/60 p-4 backdrop-blur md:grid-cols-[1fr_auto_1fr] md:p-6">
        {/* Raw folder */}
        <div className="rounded-xl border border-border/70 bg-background/70 p-4 text-left">
          <div className="mb-3 flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Folder className="size-3.5" /> ~/Downloads/AI Course
          </div>
          <ul className="space-y-1.5 font-mono text-[13px]">
            {rawFiles.map((f) => (
              <li key={f} className="flex items-center gap-2 truncate text-muted-foreground/80">
                <span className="text-muted-foreground/40">›</span> {f}
              </li>
            ))}
            <li className="pl-4 text-muted-foreground/40">+ 36 more files</li>
          </ul>
        </div>

        {/* Transform */}
        <div className="flex items-center justify-center py-1 md:px-2">
          <div className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <ArrowRight className="size-4 max-md:rotate-90" />
          </div>
        </div>

        {/* Structured course (the real sidebar look) */}
        <div className="overflow-hidden rounded-xl border border-border bg-background text-left shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs font-bold">
              <span className="grid size-4 place-items-center rounded bg-primary text-[9px] font-extrabold leading-none text-primary-foreground">O</span>
              AI Course
            </span>
            <span className="text-[10px] tabular-nums text-muted-foreground">3 / 41 · 7%</span>
          </div>
          <ul className="p-1.5">
            {lessons.map((l, i) => (
              <li
                key={l.n}
                style={{ animationDelay: `${200 + i * 90}ms` }}
                className={cn("animate-assemble flex items-center gap-2 rounded-md px-2 py-1.5", l.active && "bg-primary/10")}
              >
                {l.kind === "video"
                  ? <Play className="size-3.5 shrink-0 text-primary/80" />
                  : <FileText className="size-3.5 shrink-0 text-[#e0625a]" />}
                <span className={cn("truncate text-[13px]", l.active ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {l.n}. {l.title}
                </span>
              </li>
            ))}
          </ul>
          <div className="px-3 pb-3 pt-0.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full w-[7%] rounded-full bg-gradient-to-r from-primary to-primary/80" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
