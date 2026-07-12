import { auth } from "@/auth";
import { getStats } from "@/server/stats";
import { StatsDashboard } from "@/components/stats/StatsDashboard";

export default async function StatsPage() {
  const data = await getStats();
  const session = await auth();
  const learner = session?.user?.name ?? session?.user?.email ?? "Learner";
  return <StatsDashboard data={data} learner={learner} />;
}
