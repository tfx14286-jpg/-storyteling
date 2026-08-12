import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { ProjectCard } from "@/components/dashboard/project-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { scenes: true } } },
  });

  return (
    <AppShell user={user}>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hello {user.name} — {projects.length} project{projects.length !== 1 ? "s" : ""} in your studio.
          </p>
        </div>
        <Button asChild size="lg" className="glow-ring">
          <Link href="/create">Create New Video</Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No videos yet"
          description="Turn your first idea into a complete animated story. It takes about 10 minutes of your time — the AI does the rest."
          action={
            <Button asChild size="lg">
              <Link href="/create">Create your first video</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={{
                id: p.id,
                title: p.title,
                status: p.status,
                durationSec: p.durationSec,
                createdAt: p.createdAt.toISOString(),
                thumbnailUrl: p.thumbnailUrl,
                aspectRatio: p.aspectRatio,
                style: p.style,
                sceneCount: p._count.scenes,
              }}
              progress={p.progress}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
