"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ListVideo, Loader2 } from "lucide-react";
import { youtubeConnected, listMyPlaylists, importPlaylist, type YtPlaylist } from "@/server/youtube";
import { connectYouTube } from "@/server/authActions";
import { toast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

export function YouTubeImportButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [playlists, setPlaylists] = useState<YtPlaylist[]>([]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setConnected(null); setPlaylists([]); setUrl("");
    try {
      const c = await youtubeConnected();
      setConnected(c);
      if (c) {
        try { setPlaylists(await listMyPlaylists()); }
        catch (e) { toast((e as Error).message || "Could not load your playlists.", "error"); }
      }
    } catch { setConnected(false); }
  }

  async function doImport(idOrUrl: string) {
    if (!idOrUrl.trim() || busy) return;
    setBusy(true);
    try {
      const { id } = await importPlaylist(idOrUrl.trim());
      setOpen(false);
      router.push(`/course/${id}`);
    } catch (e) {
      toast((e as Error).message || "Import failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline"><ListVideo className="size-4" /> YouTube</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import a YouTube playlist</DialogTitle>
          <DialogDescription>Streams from YouTube (online). Your progress, notes and bookmarks are tracked here.</DialogDescription>
        </DialogHeader>

        {connected === null && <p className="text-sm text-muted-foreground">Checking your YouTube connection…</p>}

        {connected === false && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">
              Connect your Google account with YouTube read access to import playlists, including your private ones.
            </p>
            <form action={connectYouTube}><Button type="submit">Connect YouTube</Button></form>
          </div>
        )}

        {connected && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1.5 text-sm font-medium">Paste a playlist link</p>
              <div className="flex gap-2">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") doImport(url); }}
                  placeholder="https://youtube.com/playlist?list=…"
                />
                <Button onClick={() => doImport(url)} disabled={busy || !url.trim()}>Import</Button>
              </div>
            </div>

            {playlists.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-medium">Your playlists</p>
                <ul className="max-h-64 overflow-y-auto rounded-lg border border-border">
                  {playlists.map((p) => (
                    <li key={p.id}>
                      <button
                        className="flex w-full items-center gap-3 border-b border-border/60 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-muted disabled:opacity-50"
                        onClick={() => doImport(p.id)}
                        disabled={busy}
                        suppressHydrationWarning
                      >
                        {p.thumbnail
                          // eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail
                          ? <img src={p.thumbnail} alt="" className="h-8 w-14 shrink-0 rounded object-cover" />
                          : <span className="h-8 w-14 shrink-0 rounded bg-muted" />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{p.title}</span>
                          <span className="block text-xs text-muted-foreground">{p.count} video{p.count === 1 ? "" : "s"}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {busy && <p className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Importing…</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
