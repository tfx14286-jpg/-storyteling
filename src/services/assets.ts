import "server-only";
import { prisma } from "@/lib/db";
import { getStorage, storageKeyPath } from "@/lib/storage";
import { newId } from "@/lib/rate-limit";

export async function saveAsset(
  userId: string,
  projectId: string | null,
  type: string,
  data: Buffer,
  contentType: string,
  filename: string,
  opts: { provider?: string; metadata?: Record<string, unknown> } = {}
) {
  const key = storageKeyPath(userId, projectId, type.toLowerCase(), `${newId()}-${filename}`);
  const storage = getStorage();
  await storage.put(key, data, contentType);
  const asset = await prisma.asset.create({
    data: {
      userId,
      projectId,
      type,
      url: `/api/assets/${newId()}`,
      path: key,
      storageKey: key,
      providerUsed: opts.provider ?? storage.name,
      metadata: opts.metadata ? { ...opts.metadata, contentType } : { contentType },
    },
  });
  // Store the real url pointing to the asset id
  await prisma.asset.update({
    where: { id: asset.id },
    data: { url: `/api/assets/${asset.id}` },
  });
  return prisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
}

export function contentTypeFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    webm: "video/webm",
    wav: "audio/wav",
    mp3: "audio/mpeg",
    srt: "text/plain",
    vtt: "text/vtt",
    json: "application/json",
  };
  return map[ext ?? ""] || "application/octet-stream";
}
