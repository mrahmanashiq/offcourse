import { certificateId } from "@/lib/certificate";

// The certificate always renders on a light "paper" palette (fixed hex, not
// theme tokens) so the downloaded image looks like a document regardless of the
// app's light/dark theme. Fixed pixel size; the download helper snapshots it at
// a higher pixel ratio for a crisp PNG.
const PAPER = "#FBFAF7";
const INK = "#23272F";
const MUTED = "#7A828E";
const ACCENT = "#7C3AED";
const LINE = "#E5E1D8";

export function Certificate({ ref, learner, courseId, courseTitle, completedAt }: {
  ref?: React.Ref<HTMLDivElement>;
  learner: string;
  courseId: string;
  courseTitle: string;
  completedAt: number | null;
}) {
  const date = completedAt
    ? new Date(completedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "";
  const id = certificateId(courseId, completedAt);

  return (
    <div
      ref={ref}
      style={{ width: 640, height: 452, backgroundColor: PAPER, color: INK }}
      className="relative shrink-0 overflow-hidden font-sans"
    >
      {/* thin accent frame */}
      <div aria-hidden className="pointer-events-none absolute inset-3" style={{ border: `1px solid ${ACCENT}33` }} />
      {/* oversized monogram watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute select-none font-serif font-black leading-none"
        style={{ right: -24, bottom: -72, fontSize: 340, color: ACCENT, opacity: 0.05 }}
      >
        O
      </div>

      <div className="relative flex h-full flex-col justify-between px-12 py-10">
        {/* brand */}
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md text-[13px] font-bold text-white" style={{ backgroundColor: ACCENT }}>O</span>
          <span className="text-[13px] font-semibold tracking-tight">Offcourse</span>
        </div>

        {/* body */}
        <div>
          <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: "0.28em", color: MUTED }}>
            Certificate of Completion
          </p>
          <p className="mt-3 font-serif text-[34px] font-bold leading-[1.1]">{learner || "Your Name"}</p>
          <div className="mt-3 h-px w-16" style={{ backgroundColor: ACCENT }} />
          <p className="mt-4 text-[11px] uppercase tracking-widest" style={{ color: MUTED }}>has completed</p>
          <p className="mt-1 text-[17px] font-semibold leading-snug text-balance">{courseTitle}</p>
          {date && <p className="mt-3 text-[12px]" style={{ color: MUTED }}>Completed {date}</p>}
        </div>

        {/* footer */}
        <div className="flex items-end justify-between border-t pt-4" style={{ borderColor: LINE }}>
          <div>
            <p className="text-[9px] uppercase" style={{ letterSpacing: "0.2em", color: MUTED }}>Verification ID</p>
            <p className="font-mono text-[12px]">{id}</p>
          </div>
          <p className="text-[12px] font-semibold" style={{ color: ACCENT }}>Offcourse</p>
        </div>
      </div>
    </div>
  );
}
