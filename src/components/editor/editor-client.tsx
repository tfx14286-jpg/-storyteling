"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, Badge, EmptyState, Label } from "@/components/ui/card";
import { Input, Textarea, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { usePipeline } from "./pipeline-hook";
import { PipelinePanel, SceneThumb, TimelineBar, type EditorProject } from "./parts";
import { ExportDialog } from "./export-dialog";
import { CAMERA_MOVEMENTS, SHOT_TYPES, ANIMATION_LEVELS, TRANSITIONS } from "@/lib/constants";
import { formatDuration } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "default" | "outline" | "success" | "warning" | "destructive" | "accent"> = {
  DRAFT: "outline",
  SCRIPT: "warning",
  STORYBOARD: "warning",
  IMAGES: "accent",
  ANIMATED: "accent",
  VOICE: "accent",
  MUSIC: "accent",
  READY: "success",
  RENDERING: "warning",
  COMPLETED: "success",
  FAILED: "destructive",
};

export function EditorClient({ project: initialProject }: { project: EditorProject }) {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [project, setProject] = useState(initialProject);
  const [selectedId, setSelectedId] = useState<string | null>(initialProject.scenes[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [renderUrl, setRenderUrl] = useState<string | null>(initialProject.renderUrl);
  const pipeline = usePipeline(projectId);

  const onPipelineEvent = React.useCallback((data: { renderUrl?: string | null }) => {
    if (data.renderUrl) setRenderUrl(data.renderUrl);
  }, []);

  const selected = project.scenes.find((s) => s.id === selectedId) ?? project.scenes[0] ?? null;
  const hasScenes = project.scenes.length > 0;
  const busy = loading || pipeline.running;

  async function refetch() {
    const res = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const p = data.project;
    setProject({
      ...initialProject,
      id: p.id,
      title: p.title,
      status: p.status,
      progress: p.progress,
      thumbnailUrl: p.thumbnailUrl,
      scenes: p.scenes.map((s: Record<string, unknown>) => ({
        id: String(s.id),
        sceneNumber: Number(s.sceneNumber),
        duration: Number(s.duration),
        narration: String(s.narration ?? ""),
        visualDescription: String(s.visualDescription ?? ""),
        characters: (s.characters as string[]) ?? [],
        background: String(s.background ?? ""),
        cameraMovement: String(s.cameraMovement ?? "Static"),
        shotType: String(s.shotType ?? "Wide Shot"),
        animation: String(s.animation ?? "Subtle"),
        soundEffect: s.soundEffect ? String(s.soundEffect) : null,
        transition: String(s.transition ?? "Cut"),
        status: String(s.status ?? "PENDING"),
        imageUrl: s.imageUrl ? String(s.imageUrl) : null,
        voiceUrl: s.voiceUrl ? String(s.voiceUrl) : null,
        seed: s.seed ? Number(s.seed) : null,
        providerUsed: s.providerUsed ? String(s.providerUsed) : null,
      })),
    });
  }

  async function startFull() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Gagal memulai", description: data.error, variant: "destructive" });
        return;
      }
      pipeline.watch(() => void refetch(), onPipelineEvent);
    } catch {
      toast({ title: "Error", description: "Gagal menghubungi server", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function runStage(stage: string, extra: Record<string, unknown> = {}) {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Gagal", description: data.error, variant: "destructive" });
        return;
      }
      pipeline.watch(() => void refetch(), onPipelineEvent);
    } catch {
      toast({ title: "Error", description: "Gagal menghubungi server", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function updateScene(sceneId: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/scenes/${sceneId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast({ title: "Gagal menyimpan scene", variant: "destructive" });
      return;
    }
    setProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)),
    }));
  }

  async function regenerateScene(part: string) {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/scenes/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ part }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Gagal", description: data.error, variant: "destructive" });
        return;
      }
      pipeline.watch(() => void refetch(), onPipelineEvent);
    } catch {
      toast({ title: "Error", description: "Gagal menghubungi server", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function deleteProject() {
    if (!confirm("Hapus project ini? Aksi tidak bisa dibatalkan.")) return;
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (res.ok) router.push("/dashboard");
  }

  return (
    <div className="space-y-5">
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        onExport={(opts) => {
          setExportOpen(false);
          void runStage("render", {
            resolution: opts.resolution,
            fps: opts.fps,
            aspectRatio: opts.aspectRatio,
            subtitleEnabled: opts.subtitles,
            watermarkEnabled: opts.watermark,
          });
        }}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-bold">{project.title}</h1>
            <Badge variant={STATUS_VARIANT[project.status] ?? "outline"}>{project.status}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {project.style} · {project.aspectRatio} · {formatDuration(project.durationSec)} · {project.language.toUpperCase()} · {project.voice}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
            Back
          </Link>
          <Button variant="outline" size="sm" onClick={() => runStage("quality")}>
            Quality Check
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
            Export
          </Button>
          <Button size="sm" variant="ghost" onClick={deleteProject} className="text-destructive hover:text-destructive">
            Delete
          </Button>
          <Button size="sm" onClick={() => void startFull()} disabled={busy} className="glow-ring">
            {busy ? "Generating…" : "Generate Full Video"}
          </Button>
        </div>
      </div>

      {/* Progress */}
      {pipeline.running && <PipelinePanel event={pipeline.event} />}
      {!pipeline.running && renderUrl && (
        <Card className="glass p-5">
          <p className="mb-2 text-sm font-semibold">Final video</p>
          <video key={renderUrl} controls className="w-full rounded-lg bg-black" preload="metadata">
            <source src={renderUrl} />
          </video>
          <p className="mt-2 text-xs text-success">Render selesai. Video tersedia di atas.</p>
        </Card>
      )}

      {!hasScenes ? (
        <EmptyState
          title="No story yet"
          description="The AI will write a script, split it into scenes, create characters, style and environments — then generate everything for your video."
          action={
            <Button size="lg" onClick={() => void startFull()} disabled={busy} className="glow-ring">
              {busy ? "Generating story…" : "Generate Story"}
            </Button>
          }
        />
      ) : (
        <>
          {/* Storyboard strip */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8">
            {project.scenes.map((s) => (
              <SceneThumb key={s.id} scene={s} selected={s.id === selected?.id} onSelect={() => setSelectedId(s.id)} disabled={busy} />
            ))}
          </div>

          <TimelineBar scenes={project.scenes} />

          {/* Main editor area */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* Preview */}
            <Card className="overflow-hidden">
              <div className="relative aspect-video bg-black">
                {selected?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.imageUrl} alt={`Scene ${selected.sceneNumber}`} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Belum ada gambar untuk scene ini. Generate scene image dulu.
                  </div>
                )}
                {selected?.status === "FAILED" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-destructive">
                    Scene gagal digenerate. Coba regenerate.
                  </div>
                )}
              </div>
              {selected?.voiceUrl && (
                <div className="border-t border-border p-3">
                  <audio key={selected.voiceUrl} controls className="w-full" preload="none">
                    <source src={selected.voiceUrl} />
                  </audio>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">
                    Scene {String(selected?.sceneNumber ?? 1).padStart(2, "0")} · {selected ? formatDuration(selected.duration) : ""}
                  </p>
                  <Badge variant={selected?.imageUrl ? "success" : "outline"}>{selected?.imageUrl ? "Image ready" : "Pending"}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{selected?.visualDescription}</p>
                <div className="mt-3 rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Narration</p>
                  <p className="mt-1 text-sm leading-relaxed">{selected?.narration}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => regenerateScene("image")} disabled={busy}>
                    Regenerate Image
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => regenerateScene("animation")} disabled={busy}>
                    Regenerate Animation
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => regenerateScene("voice")} disabled={busy}>
                    Regenerate Voice
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => regenerateScene("prompt")} disabled={busy}>
                    Rebuild Prompt
                  </Button>
                </div>
              </div>
            </Card>

            {/* Scene settings */}
            <SceneSettings
              scene={selected}
              onUpdate={(patch) => selected && void updateScene(selected.id, patch)}
            />
          </div>

          {/* Bibles */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <div className="border-b border-border p-4">
                <p className="font-semibold">Style Bible</p>
                <p className="text-xs text-muted-foreground">Applied to every scene for visual consistency.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 p-4 text-sm sm:grid-cols-2">
                {project.styleBible &&
                  Object.entries(project.styleBible).map(([k, v]) => (
                    <div key={k}>
                      <p className="text-xs font-medium capitalize text-muted-foreground">{k.replace(/([A-Z])/g, " $1")}</p>
                      <p className="mt-0.5">{v}</p>
                    </div>
                  ))}
              </div>
            </Card>
            <Card>
              <div className="border-b border-border p-4">
                <p className="font-semibold">Character Bible</p>
                <p className="text-xs text-muted-foreground">Consistent characters across all scenes.</p>
              </div>
              <div className="space-y-4 p-4">
                {project.characters.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{c.name}</p>
                      <span className="text-xs text-primary">{c.charId}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[c.age, c.gender, c.appearance, c.clothing, c.body, c.personality].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                ))}
                {project.characters.length === 0 && <p className="text-sm text-muted-foreground">No characters yet.</p>}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function SceneSettings({
  scene,
  onUpdate,
}: {
  scene: { id: string; sceneNumber: number; duration: number; narration: string; visualDescription: string; cameraMovement: string; shotType: string; animation: string; soundEffect: string | null; transition: string; background: string } | null;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const [saved, setSaved] = useState<Record<string, number>>({});
  if (!scene) {
    return <Card className="p-5 text-sm text-muted-foreground">Pilih scene untuk mengatur detail.</Card>;
  }
  const markSaved = (key: string) => {
    setSaved((prev) => ({ ...prev, [key]: Date.now() }));
  };

  return (
    <Card className="flex max-h-[720px] flex-col overflow-hidden">
      <div className="border-b border-border p-4">
        <p className="font-semibold">Scene {String(scene.sceneNumber).padStart(2, "0")} settings</p>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-1.5">
          <Label>Duration (seconds)</Label>
          <Input
            type="number"
            min={1}
            max={120}
            value={scene.duration}
            onChange={(e) => onUpdate({ duration: Number(e.target.value) })}
            onBlur={() => markSaved("duration")}
          />
          {saved.duration && <p className="text-[10px] text-success">Saved ✓</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Narration</Label>
          <Textarea
            value={scene.narration}
            rows={4}
            onChange={(e) => onUpdate({ narration: e.target.value })}
            onBlur={() => markSaved("narration")}
          />
          {saved.narration && <p className="text-[10px] text-success">Saved ✓</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Visual description</Label>
          <Textarea
            value={scene.visualDescription}
            rows={3}
            onChange={(e) => onUpdate({ visualDescription: e.target.value })}
            onBlur={() => markSaved("visual")}
          />
          {saved.visual && <p className="text-[10px] text-success">Saved ✓</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Camera movement</Label>
          <Select value={scene.cameraMovement} onChange={(e) => onUpdate({ cameraMovement: e.target.value })}>
            {CAMERA_MOVEMENTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Shot type</Label>
            <Select value={scene.shotType} onChange={(e) => onUpdate({ shotType: e.target.value })}>
              {SHOT_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Animation</Label>
            <Select value={scene.animation} onChange={(e) => onUpdate({ animation: e.target.value })}>
              {ANIMATION_LEVELS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Transition</Label>
            <Select value={scene.transition} onChange={(e) => onUpdate({ transition: e.target.value })}>
              {TRANSITIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Sound effect</Label>
            <Input
              placeholder="birds, wind…"
              value={scene.soundEffect ?? ""}
              onChange={(e) => onUpdate({ soundEffect: e.target.value || null })}
              onBlur={() => markSaved("sfx")}
            />
            {saved.sfx && <p className="text-[10px] text-success">Saved ✓</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Background / environment</Label>
          <Input
            value={scene.background}
            onChange={(e) => onUpdate({ background: e.target.value })}
            onBlur={() => markSaved("bg")}
          />
          {saved.bg && <p className="text-[10px] text-success">Saved ✓</p>}
        </div>
      </div>
    </Card>
  );
}
