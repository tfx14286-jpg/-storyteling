"use client";

import Link from "next/link";
import { Badge, Card, Progress, Skeleton } from "@/components/ui/card";
import { formatDate, formatDuration } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; variant: "default" | "outline" | "success" | "warning" | "destructive" | "accent"; color: string }> = {
  DRAFT: { label: "Draft", variant: "outline", color: "#8b96ad" },
  SCRIPT: { label: "Scripting", variant: "warning", color: "#fbbf24" },
  STORYBOARD: { label: "Storyboard", variant: "warning", color: "#fbbf24" },
  IMAGES: { label: "Images", variant: "accent", color: "#22d3ee" },
  ANIMATED: { label: "Animating", variant: "accent", color: "#22d3ee" },
  VOICE: { label: "Voice", variant: "accent", color: "#22d3ee" },
  MUSIC: { label: "Audio", variant: "accent", color: "#22d3ee" },
  READY: { label: "Ready", variant: "success", color: "#34d399" },
  RENDERING: { label: "Rendering", variant: "warning", color: "#fbbf24" },
  COMPLETED: { label: "Completed", variant: "success", color: "#34d399" },
  FAILED: { label: "Failed", variant: "destructive", color: "#f43f5e" },
};

export function ProjectStatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, variant: "outline" as const, color: "#8b96ad" };
  return (
    <Badge variant={meta.variant}>
      <span className="mr-1 h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </Badge>
  );
}

export function ProjectCard({ project, progress }: { project: { id: string; title: string; status: string; durationSec: number; createdAt: string; thumbnailUrl: string | null; aspectRatio: string; style: string; sceneCount?: number }; progress?: number }) {
  const busy = ["SCRIPT", "STORYBOARD", "IMAGES", "ANIMATED", "VOICE", "MUSIC", "RENDERING", "DRAFT"].includes(project.status);
  return (
    <Link href={`/editor/${project.id}`} className="group">
      <Card className="overflow-hidden transition-all group-hover:border-primary/40 group-hover:shadow-lg">
        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/25 to-accent/15">
          {project.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.thumbnailUrl} alt={project.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center text-3xl">🎬</div>
          )}
          <div className="absolute right-2 top-2">
            <ProjectStatusBadge status={project.status} />
          </div>
          {busy && (
            <div className="absolute inset-x-0 bottom-0 p-2">
              <Progress value={progress ?? 0} className="bg-black/30" />
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="line-clamp-1 font-semibold">{project.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDuration(project.durationSec)} · {project.aspectRatio} · {project.style} · {formatDate(project.createdAt)}
          </p>
          {typeof project.sceneCount === "number" && (
            <p className="mt-1 text-xs text-muted-foreground">{project.sceneCount} scenes</p>
          )}
        </div>
      </Card>
    </Link>
  );
}

export function ProjectSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </Card>
  );
}
