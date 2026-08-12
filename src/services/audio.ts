import "server-only";
import { prisma } from "@/lib/db";
import { getMusicProvider } from "@/lib/ai/registry";
import { saveAsset } from "@/services/assets";
import { buildTimeline } from "@/services/subtitle";

export async function generateMusicForProject(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const settings = await prisma.projectSettings.upsert({
    where: { projectId },
    create: { projectId },
    update: {},
  });

  const { total } = await buildTimeline(projectId);
  const provider = getMusicProvider();
  const category = settings.musicCategory || "Documentary";

  const music = await provider.generateMusic(category, Math.min(total, 600));
  const asset = await saveAsset(project.userId, projectId, "AUDIO", music.data, music.contentType, "background-music.wav", {
    provider: provider.name,
    metadata: { type: "MUSIC", duration: music.duration, category },
  });

  await prisma.audioTrack.create({
    data: { projectId, type: "MUSIC", url: asset.url, startTime: 0, duration: music.duration, volume: 0.18, title: `Background (${category})` },
  });

  // SFX per scene
  const scenes = await prisma.scene.findMany({ where: { projectId }, orderBy: { order: "asc" } });
  for (const scene of scenes) {
    if (!scene.soundEffect) continue;
    try {
      const sfx = await provider.generateSfx(scene.soundEffect, Math.min(scene.duration, 15));
      const sfxAsset = await saveAsset(project.userId, projectId, "AUDIO", sfx.data, sfx.contentType, `sfx-scene-${String(scene.sceneNumber).padStart(2, "0")}.wav`, {
        provider: provider.name,
        metadata: { type: "SFX", duration: sfx.duration, label: scene.soundEffect, sceneId: scene.id },
      });
      await prisma.audioTrack.create({
        data: { projectId, sceneId: scene.id, type: "SFX", url: sfxAsset.url, duration: sfx.duration, volume: 0.35, title: scene.soundEffect },
      });
    } catch {
      // SFX failure should not break the pipeline.
    }
  }

  await prisma.project.update({ where: { id: projectId }, data: { status: "MUSIC" } });
}
