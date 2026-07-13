import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline - Offcourse" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-primary text-2xl font-extrabold text-white">O</div>
      <h1 className="text-xl font-bold">You&rsquo;re offline</h1>
      <p className="text-sm text-muted-foreground">
        Offcourse needs a connection to load your library and progress. Any course videos you&rsquo;ve
        opened stay on your own drive - reconnect and everything will be here.
      </p>
      <a
        href="/library"
        className="mt-2 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-white"
      >
        Try again
      </a>
    </main>
  );
}
