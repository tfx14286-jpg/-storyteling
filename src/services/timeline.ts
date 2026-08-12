import "server-only";
import { prisma } from "@/lib/db";
import type { Scene } from "@/generated/prisma/client";

export async function getVoiceDuration(scene: Scene): Promise<number> {
  if (!scene.voiceUrl) {
    // Estimate from narration.
    const words = scene.narration.trim().split(/\s+/).length;
    return Math.max(2, words / 2.6);
  }
  const id = scene.voiceUrl.split("/").pop();
  if (!id) return scene.duration;
  const asset = await prisma.asset.findUnique({ where: { id } });
  const meta = (asset?.metadata ?? {}) as { duration?: number };
  if (typeof meta.duration === "number") return meta.duration;
  return scene.duration;
}

export async function getProjectTimeline(projectId: string) {
  const scenes = await prisma.scene.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
  let cursor = 0;
  const entries = scenes.map((scene) => {
    const dur = Math.max(scene.duration, 1);
    const entry = { scene, start: cursor, end: cursor + dur, duration: dur };
    cursor += dur;
    return entry;
  });
  return { entries, total: cursor };
}
