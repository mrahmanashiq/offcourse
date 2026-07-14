import Link from "next/link";
import {
  ShieldCheck, HardDrive, EyeOff, KeyRound, FolderOpen, Gauge,
  NotebookPen, Bookmark, FileText, MonitorPlay,
} from "lucide-react";
import { auth } from "@/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UnsupportedBrowser } from "@/components/UnsupportedBrowser";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InstallButton } from "@/components/InstallButton";
import { Reveal } from "./Reveal";
import { HeroShowcase } from "./HeroShowcase";

const REPO = "https://github.com/mrahmanashiq/offcourse";

// lucide-react dropped brand marks, so inline the GitHub logo.
function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.55v-1.94c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.3-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.75.12 3.05.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.66.41.36.78 1.07.78 2.15v3.19c0 .3.2.66.79.55A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z" />
    </svg>
  );
}

const privacy = [
  { icon: HardDrive, title: "Files never leave your device", desc: "Videos stream straight from your drive via the File System Access API. Nothing is uploaded - not even multi-gigabyte courses." },
  { icon: KeyRound, title: "You control the access", desc: "Offcourse only reads the folder you pick, only while you use it. The permission lives in your browser and you can revoke it anytime." },
  { icon: EyeOff, title: "No ads, no trackers", desc: "No analytics scripts and no third-party trackers watching what you learn. Only your progress, notes, and bookmarks sync to your account." },
  { icon: GithubMark, title: "Open source & auditable", desc: "Every line is public under the MIT license. Read it, self-host it, and verify the privacy claims for yourself." },
];

const features = [
  { icon: FolderOpen, title: "Open any folder", desc: "Subfolders become modules and videos become lessons - a course sidebar is built for you automatically." },
  { icon: Gauge, title: "Progress that follows you", desc: "Resumes your exact timestamp and tracks completed lessons across every device you sign in on." },
  { icon: MonitorPlay, title: "A real player", desc: "Playback speed, picture-in-picture, captions, and keyboard shortcuts - powered by Vidstack." },
  { icon: NotebookPen, title: "Markdown notes", desc: "Take notes beside the video, autosaved as you type. Export a lesson or the whole course to .md." },
  { icon: Bookmark, title: "Timestamp bookmarks", desc: "Mark the moments that matter and jump right back to them in one click." },
  { icon: FileText, title: "Inline PDFs", desc: "Course PDFs and slides open right inside the player - no context switching." },
];

export default async function Landing() {
  const session = await auth();
  return (
    <div className="min-h-dvh">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-gradient-to-br from-primary to-primary/70 font-bold text-primary-foreground">O</span>
            <span className="font-bold">Offcourse</span>
            <Badge variant="secondary" className="ml-1 hidden gap-1 sm:inline-flex"><GithubMark className="size-3" /> Open source</Badge>
          </div>
          <nav className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <a href={REPO} target="_blank" rel="noreferrer"><GithubMark className="size-4" /> GitHub</a>
            </Button>
            <InstallButton />
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href={session ? "/library" : "/login"}>{session ? "Library" : "Sign in"}</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-120px] -z-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/15 blur-[130px]" />
        <div className="mx-auto max-w-5xl px-6 pb-12 pt-20 text-center sm:pt-28">
          <div className="mx-auto max-w-3xl">
            <Badge variant="outline" className="mb-5 gap-1.5">
              <ShieldCheck className="size-3.5 text-primary" /> Local-first · MIT licensed
            </Badge>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl md:text-[3.5rem] md:leading-[1.05]">
              A private home for the courses you already downloaded
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-muted-foreground">
              Point Offcourse at a folder of course videos and get a real learning experience - modules, progress, notes, and bookmarks. Your video files never leave your device.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href={session ? "/library" : "/login"}>{session ? "Go to your library" : "Get started"}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={REPO} target="_blank" rel="noreferrer"><GithubMark className="size-4" /> Star on GitHub</a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Runs in Chrome &amp; Edge · No install · Free &amp; open source</p>
            <UnsupportedBrowser />
          </div>
          <HeroShowcase />
        </div>
      </section>

      {/* Privacy - the centerpiece */}
      <section className="border-y border-border/60 bg-card/40">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-3 gap-1"><ShieldCheck className="size-3" /> Privacy by design</Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Your data stays yours</h2>
            <p className="mt-3 text-muted-foreground">
              Offcourse is built so your course videos never touch a server. Only lightweight metadata - titles, progress, notes, and bookmarks - syncs to your account so you can pick up on any device.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {privacy.map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 80} className="rounded-xl border border-border bg-background/60 p-5 transition-colors hover:border-primary/40">
                <div className="mb-3 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Everything you need to actually finish it</h2>
          <p className="mt-3 text-muted-foreground">The structure of a course platform, running entirely on your machine.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={(i % 3) * 80}>
              <Card className="h-full gap-0 py-5 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                <CardHeader className="gap-2">
                  <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="mt-2 text-base">{title}</CardTitle>
                  <CardDescription>{desc}</CardDescription>
                </CardHeader>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <Reveal className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-14 text-center">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-primary/10 to-transparent" />
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">Turn that download folder into a course</h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">Free, open source, and private. Open a folder and start learning in seconds.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href={session ? "/library" : "/login"}>{session ? "Go to your library" : "Get started"}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={REPO} target="_blank" rel="noreferrer"><GithubMark className="size-4" /> View source</a>
            </Button>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-8 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <span>Offcourse - a local-first, open-source course player. MIT licensed.</span>
          <div className="flex items-center gap-4">
            <a href={REPO} target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">GitHub</a>
            <span>Chrome &amp; Edge</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
