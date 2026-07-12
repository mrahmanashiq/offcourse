"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Flame, CircleCheck, GraduationCap, BookOpen, Target, Plus, Minus } from "lucide-react";
import type { StatsData } from "@/server/statsTypes";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Heatmap } from "./Heatmap";
import { CertificateDialog } from "./CertificateDialog";

const GOAL_KEY = "offcourse:weeklyGoal";

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Tile({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function StatsDashboard({ data, learner }: { data: StatsData; learner: string }) {
  const { totals, inProgress, completedCourses, completions } = data;
  const [now, setNow] = useState<number | null>(null);
  const [goal, setGoal] = useState(5);

  useEffect(() => {
    setNow(Date.now());
    const g = parseInt(localStorage.getItem(GOAL_KEY) || "5", 10);
    if (Number.isFinite(g) && g > 0) setGoal(g);
  }, []);

  function updateGoal(next: number) {
    const g = Math.max(1, Math.min(50, next));
    setGoal(g);
    try { localStorage.setItem(GOAL_KEY, String(g)); } catch { /* ignore */ }
  }

  const { current, longest, thisWeek } = useMemo(() => {
    if (now === null) return { current: 0, longest: 0, thisWeek: 0 };
    const set = new Set(completions.map((t) => dayKey(new Date(t))));

    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const probe = new Date(today);
    if (!set.has(dayKey(probe))) probe.setDate(probe.getDate() - 1); // grace for "today not done yet"
    let cur = 0;
    while (set.has(dayKey(probe))) { cur++; probe.setDate(probe.getDate() - 1); }

    let longest = 0, run = 0;
    let prevKey: string | null = null;
    for (const k of [...set].sort()) {
      if (prevKey) {
        const pd = new Date(`${prevKey}T00:00:00`); pd.setDate(pd.getDate() + 1);
        run = dayKey(pd) === k ? run + 1 : 1;
      } else run = 1;
      longest = Math.max(longest, run);
      prevKey = k;
    }

    const monday = new Date(today);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const thisWeek = completions.filter((t) => t >= monday.getTime()).length;

    return { current: cur, longest, thisWeek };
  }, [now, completions]);

  const goalPct = Math.min(100, Math.round((thisWeek / goal) * 100));
  const hasData = totals.totalLessons > 0;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/library"><ArrowLeft className="size-4" /> Library</Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Your progress</h1>
        <p className="mt-1 text-muted-foreground">Keep the streak going.</p>

        {!hasData ? (
          <div className="mt-10 rounded-xl border border-border bg-card p-10 text-center">
            <p className="font-semibold">No activity yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Complete a lesson and your streak, heatmap, and stats will show up here.</p>
            <Button asChild className="mt-4"><Link href="/library">Go to your library</Link></Button>
          </div>
        ) : (
          <>
            {/* Stat tiles */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile icon={CircleCheck} value={<>{totals.lessonsCompleted}<span className="text-base font-normal text-muted-foreground"> / {totals.totalLessons}</span></>} label="Lessons completed" />
              <Tile icon={GraduationCap} value={totals.coursesCompleted} label="Courses completed" />
              <Tile icon={BookOpen} value={totals.coursesInProgress} label="In progress" />
              <Tile icon={Flame} value={now === null ? "—" : current} label={current === 1 ? "day streak" : "day streak"} />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              {/* Activity heatmap */}
              <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold">Activity</h2>
                  {now !== null && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Flame className="size-4 text-primary" />
                      {current} day{current === 1 ? "" : "s"} · longest {longest}
                    </span>
                  )}
                </div>
                {now === null ? <div className="h-28" /> : <Heatmap completions={completions} now={now} />}
              </div>

              {/* Weekly goal */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Target className="size-4 text-primary" />
                  <h2 className="font-semibold">Weekly goal</h2>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Lessons / week</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon-sm" onClick={() => updateGoal(goal - 1)} aria-label="Decrease goal"><Minus className="size-3.5" /></Button>
                    <span className="w-6 text-center font-semibold tabular-nums">{goal}</span>
                    <Button variant="outline" size="icon-sm" onClick={() => updateGoal(goal + 1)} aria-label="Increase goal"><Plus className="size-3.5" /></Button>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${now === null ? 0 : goalPct}%` }} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {now === null ? "…" : <><span className="font-semibold text-foreground tabular-nums">{thisWeek}</span> of {goal} this week{thisWeek >= goal ? " — goal reached 🎉" : ""}</>}
                </p>
              </div>
            </div>

            {/* Continue learning */}
            {inProgress.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 font-semibold">Continue learning</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {inProgress.slice(0, 4).map((c) => (
                    <Link key={c.id} href={`/course/${c.id}`} className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate font-semibold">{c.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{c.percent}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${c.percent}%` }} />
                      </div>
                      {c.nextLesson && <p className="mt-2 truncate text-xs text-muted-foreground">Next: {c.nextLesson}</p>}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Certificates */}
            {completedCourses.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 font-semibold">Certificates</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {completedCourses.map((c) => (
                    <CertificateDialog key={c.id} course={c} learner={learner} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
