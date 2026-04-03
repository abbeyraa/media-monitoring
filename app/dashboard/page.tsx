import { redirect } from "next/navigation";

import { DashboardClient } from "@/components/dashboard-client";
import { getTargets } from "@/lib/session-store";
import { getMonitoringSections } from "@/lib/social/service";
import { requireSession } from "@/lib/server-auth";

export default async function DashboardPage() {
  const session = await requireSession();

  if (!session) {
    redirect("/login");
  }

  const targets = getTargets(session.sessionId);
  const contentLimit = 5;
  const sections = await getMonitoringSections(targets, contentLimit);

  return (
    <main className="min-h-screen bg-zinc-100">
      <DashboardClient
        username={session.username}
        initialData={{
          targets,
          sections,
          contentLimit,
          refreshedAt: new Date().toISOString(),
        }}
      />
    </main>
  );
}
