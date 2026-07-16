"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { listCourses, listCollections } from "@/lib/data/facade";
import { DATA_CHANGED_EVENT } from "@/lib/data/mode";
import type { CourseSummary } from "@/server/courseTypes";
import type { Collection } from "@/lib/data/source";
import { AddCourseButton } from "./AddCourseButton";
import { LibraryGrid } from "./LibraryGrid";
import { UnsupportedBrowser } from "@/components/UnsupportedBrowser";
import { CommandSearchButton } from "@/components/CommandSearchButton";
import { LocalModeBadge } from "@/components/LocalModeBadge";
import { BrandMark } from "@/components/BrandMark";
import { UserMenu } from "@/components/UserMenu";
import { InstallButton } from "@/components/InstallButton";
import { YouTubeImportButton } from "@/components/YouTubeImportButton";
import { Button } from "@/components/ui/button";

type SessionUser = { name: string | null; email: string | null; image: string | null };

export function LibraryView({ isLocal, owner, user }: { isLocal: boolean; owner: string | null; user: SessionUser | null }) {
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      listCourses().then((c) => { if (!cancelled) setCourses(c); }).catch(() => { if (!cancelled) setCourses([]); });
      listCollections().then((c) => { if (!cancelled) setCollections(c); }).catch(() => { if (!cancelled) setCollections([]); });
    };
    load();
    window.addEventListener(DATA_CHANGED_EVENT, load);
    return () => { cancelled = true; window.removeEventListener(DATA_CHANGED_EVENT, load); };
  }, []);

  return (
    <main id="main" className="mx-auto max-w-6xl p-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrandMark className="size-10 text-lg" />
          <h1 className="text-3xl font-extrabold tracking-tight">{owner ? `${owner}’s Courses` : "Your courses"}</h1>
          {isLocal && <LocalModeBadge />}
        </div>
        <div className="flex items-center gap-2">
          <InstallButton />
          <CommandSearchButton />
          {!isLocal && (
            <Button asChild variant="outline">
              <Link href="/stats"><TrendingUp className="size-4" /> Progress</Link>
            </Button>
          )}
          {!isLocal && <YouTubeImportButton accountEmail={user?.email ?? null} />}
          <AddCourseButton />
          {user && <UserMenu name={user.name} email={user.email} image={user.image} />}
        </div>
      </header>
      <UnsupportedBrowser />
      {courses === null ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-muted/40" />
          ))}
        </div>
      ) : (
        <LibraryGrid courses={courses} collections={collections} />
      )}
    </main>
  );
}
