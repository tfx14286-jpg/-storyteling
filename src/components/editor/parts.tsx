"use client";

import { Card, Progress } from "@/components/ui/card";
import { cn, formatDuration, secondsToClock } from "@/lib/utils";

export type EditorScene = {
  id: string;
  sceneNumber: number;
  duration: number;
  narration: string;
  visualDescription: string;
  characters: string[];
  background: string;
  cameraMovement: string;
  shotType: string;
  animation: string;
  soundEffect: string | null;
  transition: string;
  status: string;
  imageUrl: string | null;
  voiceUrl: string | null;
  seed: number | null;
  providerUsed: string | null;
};

export type EditorCharacter = {
  id: string;
  charId: string;
  name: string;
  age: number | null;
  gender: string | null;
  appearance: string | null;
  clothing: string | null;
  colors: string | null;
  body: string | null;
  personality: string | null;
  expressions: string[];
  accessories: string | null;
  referenceImageUrl: string | null;
};

export type EditorProject = {
  id: string;
  title: string;
  description: string;
  language: string;
  durationSec: number;
  aspectRatio: string;
  style: string;
  voice: string;
  tone: string;
  status: string;
  progress: number;
  thumbnailUrl: string | null;
  renderUrl: string | null;
  script: Record<string, unknown> | null;
  styleBible: Record<string, string> | null;
  scenes: EditorScene[];
  characters: EditorCharacter[];
  environments: {
    id: string;
    envId: string;
    name: string;
    architecture: string | null;
    environment: string | null;
    lighting: string | null;
    colorPalette: string | null;
    description: string | null;
  }[];
};

export const STAGE_LABELS: Record<string, string> = {
  full_pipeline: "Full video generation",
  script_generation: "Script & storyboard",
  image_generation: "Scene images",
  video_generation: "Animation",
  tts_generation: "Voice-over",
  subtitle_generation: "Subtitles",
  audio_mix: "Music & SFX",
  quality_check: "Quality check",
  thumbnail_generation: "Thumbnail",
  render: "Rendering",
};

export function PipelinePanel({
  event,
}: {
  event: { progress?: number; stage?: string; message?: string; jobProgress?: number; status?: string; renderUrl?: string | null };
}) {
  const progress = event.progress ?? 0;
  const jobProgress = event.jobProgress ?? 0;
  const shown =
    progress > 0 && progress < 100 ? progress : jobProgress > 0 && jobProgress < 100 ? jobProgress : progress;
  return (
    <Card className="glass p-5">
      {event.renderUrl && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-semibold">Final video</p>
          <video key={event.renderUrl} controls className="w-full rounded-lg bg-black" preload="metadata">
            <source src={event.renderUrl} />
          </video>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-success live-dot" />
        <p className="text-sm font-medium">{event.message || STAGE_LABELS[event.stage ?? ""] || "Working…"}</p>
        <span className="ml-auto text-sm font-semibold text-primary">{Math.round(shown)}%</span>
      </div>
      <Progress value={shown} className="mt-3" />
      {event.stage && <p className="mt-2 text-xs text-muted-foreground">{STAGE_LABELS[event.stage] ?? event.stage}</p>}
      {event.status === "COMPLETED" && event.renderUrl && (
        <p className="mt-2 text-xs text-success">Render selesai. Video tersedia di atas.</p>
      )}
      {event.status === "FAILED" && (
        <p className="mt-2 text-xs text-destructive">{event.message || "Pipeline gagal."}</p>
      )}
    </Card>
  );
}

export function SceneThumb({
  scene,
  selected,
  onSelect,
  disabled,
}: {
  scene: EditorScene;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "group relative w-full overflow-hidden rounded-lg border text-left transition-all",
        selected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
      )}
    >
      <div className="relative aspect-video bg-gradient-to-br from-secondary to-muted">
        {scene.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={scene.imageUrl} alt={`Scene ${scene.sceneNumber}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-lg opacity-40">🎨</div>
        )}
        <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {String(scene.sceneNumber).padStart(2, "0")}
        </span>
        {scene.status === "FAILED" && (
          <span className="absolute right-1.5 top-1.5 rounded bg-destructive/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            FAILED
          </span>
        )}
      </div>
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="truncate text-[11px] text-muted-foreground">{formatDuration(scene.duration)}</span>
        <span className={cn("h-1.5 w-1.5 rounded-full", scene.imageUrl ? "bg-success" : "bg-muted-foreground/40")} />
      </div>
    </button>
  );
}

export function TimelineBar({ scenes }: { scenes: EditorScene[] }) {
  const total = scenes.reduce((a, s) => a + s.duration, 0) || 1;
  const offsets = scenes.reduce<number[]>((acc, s, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + scenes[i - 1].duration);
    return acc;
  }, []);
  return (
    <div className="flex w-full gap-0.5">
      {scenes.map((s, i) => (
        <div
          key={s.id}
          title={`Scene ${s.sceneNumber} · ${secondsToClock(offsets[i])}`}
          className={cn(
            "h-2 rounded-sm",
            s.imageUrl ? "bg-primary" : "bg-muted",
            s.status === "FAILED" && "bg-destructive"
          )}
          style={{ width: `${(s.duration / total) * 100}%` }}
        />
      ))}
    </div>
  );
}
