import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { listCourses } from "@/server/courses";
import { AddCourseButton } from "./AddCourseButton";
import { LibraryGrid } from "./LibraryGrid";
import { UnsupportedBrowser } from "@/components/UnsupportedBrowser";
import { CommandSearchButton } from "@/components/CommandSearchButton";
import { Button } from "@/components/ui/button";

export default async function LibraryPage() {
  const courses = await listCourses();
  return (
    <main className="mx-auto max-w-6xl p-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Your courses</h1>
        <div className="flex items-center gap-2">
          <CommandSearchButton />
          <Button asChild variant="outline">
            <Link href="/stats"><TrendingUp className="size-4" /> Progress</Link>
          </Button>
          <AddCourseButton />
        </div>
      </header>
      <UnsupportedBrowser />
      <LibraryGrid courses={courses} />
    </main>
  );
}
