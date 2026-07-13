import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { getStats } from "@/server/stats";
import { StatsDashboard } from "@/components/stats/StatsDashboard";
import { Button } from "@/components/ui/button";

export default async function StatsPage() {
  const session = await auth();

  // Local-only mode has no server-side progress to aggregate yet.
  if (!session?.user?.id) {
    return (
      <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-xl font-bold">Progress dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your streaks, heatmap and certificates live with your account. In local mode your progress is
          saved on this device, and the full dashboard is coming to local mode next.
        </p>
        <Button asChild variant="outline"><Link href="/library"><ArrowLeft className="size-4" /> Back to library</Link></Button>
      </main>
    );
  }

  const data = await getStats();
  const learner = session.user.name ?? session.user.email ?? "Learner";
  return <StatsDashboard data={data} learner={learner} />;
}
