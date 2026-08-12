import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";
import { EditorClient } from "@/components/editor/editor-client";

export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await requireUser();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      scenes: { orderBy: { order: "asc" } },
      characters: true,
      environments: true,
      settings: true,
    },
  });
  if (!project || project.userId !== user.id) notFound();

  const renderAsset = await prisma.asset.findFirst({
    where: { projectId, type: "RENDER" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const serialized = {
    id: project.id,
    title: project.title,
    description: project.description,
    language: project.language,
    durationSec: project.durationSec,
    aspectRatio: project.aspectRatio,
    style: project.style,
    voice: project.voice,
    tone: project.tone,
    status: project.status,
    progress: project.progress,
    thumbnailUrl: project.thumbnailUrl,
    renderUrl: renderAsset ? `/api/assets/${renderAsset.id}` : null,
    script: project.script as Record<string, unknown> | null,
    styleBible: project.styleBible as Record<string, string> | null,
    scenes: project.scenes.map((s) => ({
      id: s.id,
      sceneNumber: s.sceneNumber,
      duration: s.duration,
      narration: s.narration,
      visualDescription: s.visualDescription,
      characters: s.characters as string[],
      background: s.background,
      cameraMovement: s.cameraMovement,
      shotType: s.shotType,
      animation: s.animation,
      soundEffect: s.soundEffect,
      transition: s.transition,
      status: s.status,
      imageUrl: s.imageUrl,
      voiceUrl: s.voiceUrl,
      seed: s.seed,
      providerUsed: s.providerUsed,
    })),
    characters: project.characters.map((c) => ({ id: c.id, charId: c.charId, name: c.name, age: c.age, gender: c.gender, appearance: c.appearance, clothing: c.clothing, colors: c.colors, body: c.body, personality: c.personality, expressions: c.expressions as string[], accessories: c.accessories, referenceImageUrl: c.referenceImageUrl })),
    environments: project.environments.map((e) => ({ id: e.id, envId: e.envId, name: e.name, architecture: e.architecture, environment: e.environment, lighting: e.lighting, colorPalette: e.colorPalette, description: e.description })),
  };

  return (
    <AppShell user={user}>
      <EditorClient project={serialized} />
    </AppShell>
  );
}
