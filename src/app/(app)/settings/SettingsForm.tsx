"use client";
import Link from "next/link";
import { ArrowLeft, User, Sparkles, Bell, Palette } from "lucide-react";
import { useSetting, isOn } from "@/lib/settings";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function SettingsForm({ accountName, email }: { accountName: string; email: string | null }) {
  const [fullName, setFullName] = useSetting("fullName");
  const [ai, setAi] = useSetting("aiTranscription");
  const [notif, setNotif] = useSetting("notifications");

  async function toggleNotif(on: boolean) {
    if (on && typeof Notification !== "undefined" && Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { toast("Notifications are blocked in your browser settings.", "info"); return; }
    }
    setNotif(on ? "1" : "0");
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center px-6 py-3">
          <Button asChild variant="ghost" size="sm"><Link href="/library"><ArrowLeft className="size-4" /> Library</Link></Button>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">Preferences are saved on this device.</p>

        <div className="mt-8 flex flex-col gap-4">
          <Section icon={User} title="Profile">
            <label htmlFor="fullName" className="text-sm font-medium">Full name</label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={accountName || "Your name"} className="mt-1.5 max-w-sm" />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Shown on your completion certificates.{email ? ` Signed in as ${email}.` : ""}
            </p>
          </Section>

          <Section icon={Sparkles} title="Learning">
            <Row label="On-device transcription & AI" desc="Generate lesson transcripts locally with Whisper. Runs on your device; the first use downloads a small model, then works offline.">
              <Switch checked={isOn(ai)} onCheckedChange={(v) => setAi(v ? "1" : "0")} aria-label="On-device transcription" />
            </Row>
          </Section>

          <Section icon={Bell} title="Notifications">
            <Row label="Enable notifications" desc="For Pomodoro breaks and study reminders.">
              <Switch checked={isOn(notif)} onCheckedChange={toggleNotif} aria-label="Enable notifications" />
            </Row>
          </Section>

          <Section icon={Palette} title="Appearance">
            <Row label="Theme" desc="Switch between light and dark.">
              <ThemeToggle />
            </Row>
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2"><Icon className="size-4 text-primary" /><h2 className="font-semibold">{title}</h2></div>
      {children}
    </section>
  );
}

function Row({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
