import "server-only";
import { prisma } from "@/lib/db";
import { getTTSProvider } from "@/lib/ai/registry";
import { saveAsset } from "@/services/assets";

export async function generateVoiceForScene(projectId: string, sceneId: string) {
  const scene = await prisma.scene.findUniqueOrThrow({ where: { id: sceneId } });
  if (!scene.narration) throw new Error("Scene has no narration");
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });

  const provider = getTTSProvider();
  const result = await provider.synthesize({
    text: scene.narration,
    voice: project.voice,
    language: project.language,
    speed: 1,
  });

  const asset = await saveAsset(
    project.userId,
    projectId,
    "AUDIO",
    result.data,
    result.contentType,
    `voice-scene-${String(scene.sceneNumber).padStart(2, "0")}.wav`,
    { provider: provider.name, metadata: { sceneId, duration: result.duration } }
  );

  await prisma.scene.update({
    where: { id: sceneId },
    data: { voiceUrl: asset.url, status: "READY" },
  });

  return asset;
}

export async function generateVoiceForProject(projectId: string) {
  const scenes = await prisma.scene.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
  for (const scene of scenes) {
    await generateVoiceForScene(projectId, scene.id);
  }
  await prisma.project.update({ where: { id: projectId }, data: { status: "VOICE" } });
  return scenes.length;
}
