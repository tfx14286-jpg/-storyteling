import "server-only";
import { prisma } from "@/lib/db";
import { getImageProvider } from "@/lib/ai/registry";
import { saveAsset, contentTypeFor } from "@/services/assets";
import type { Scene, Project } from "@/generated/prisma/client";

export async function buildImagePromptForScene(
  project: Project,
  scene: Scene,
  characters: { name: string; appearance: string | null; clothing: string | null }[],
  environments: { envId: string; name: string; environment: string | null; architecture: string | null; colorPalette: string | null }[]
): Promise<string> {
  const sb = (project.styleBible ?? {}) as Record<string, string>;
  const styleBlock = [
    sb.visualStyle,
    sb.line,
    sb.color,
    sb.lighting,
    sb.characters,
    sb.background,
    sb.camera,
    sb.texture,
    sb.rendering,
  ]
    .filter(Boolean)
    .join(". ");

  const charBlock = characters
    .map((c) => `${c.name}: ${c.appearance ?? ""} wearing ${c.clothing ?? ""}`)
    .join("; ");

  const env = environments.find((e) => scene.background?.includes(e.envId));
  const envBlock = env
    ? `${env.envId} ${env.name}: ${env.environment}. ${env.architecture}. Palette: ${env.colorPalette}`
    : `Background: ${scene.background}`;

  return [
    `STYLE: ${styleBlock}`,
    characters.length ? `CHARACTERS: ${charBlock}` : "",
    `ENVIRONMENT: ${envBlock}`,
    `SCENE: ${scene.visualDescription}`,
    `COMPOSITION: ${scene.composition}. Shot: ${scene.shotType}.`,
    `CAMERA: ${scene.cameraMovement}.`,
    `LIGHTING: ${scene.lighting}.`,
    `ACTION: ${scene.animation}.`,
    `EMOTION: ${scene.emotion}.`,
    "CONSISTENCY: Keep all recurring characters visually identical in face, hair, clothing and proportions.",
  ]
    .filter(Boolean)
    .join("\n");
}

export const DEFAULT_NEGATIVE =
  "inconsistent character, different clothing, different face, extra fingers, deformed hands, duplicate character, bad anatomy, text, watermark, logo, low quality, blurry, photorealistic, jpeg artifacts";

export async function generateSceneImage(projectId: string, sceneId: string, opts: { seed?: number } = {}) {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const scene = await prisma.scene.findUniqueOrThrow({ where: { id: sceneId } });
  const characters = await prisma.character.findMany({ where: { projectId } });
  const environments = await prisma.environment.findMany({ where: { projectId } });

  const prompt =
    scene.imagePrompt ??
    (await buildImagePromptForScene(
      project,
      scene,
      characters.map((c) => ({ name: c.name, appearance: c.appearance, clothing: c.clothing })),
      environments.map((e) => ({
        envId: e.envId,
        name: e.name,
        environment: e.environment,
        architecture: e.architecture,
        colorPalette: e.colorPalette,
      }))
    ));

  const provider = getImageProvider();
  const charRef = characters.find((c) => (scene.characters as string[] | null)?.includes(c.charId))?.referenceImageUrl;

  const result = await provider.generate({
    prompt,
    negativePrompt: scene.negativePrompt ?? DEFAULT_NEGATIVE,
    aspectRatio: project.aspectRatio,
    characterRefUrl: charRef ?? undefined,
    seed: opts.seed ?? scene.seed ?? undefined,
  });

  // Persist image asset.
  const asset = await saveAsset(
    project.userId,
    projectId,
    "IMAGE",
    result.data,
    result.contentType,
    `scene-${String(scene.sceneNumber).padStart(2, "0")}.${extFor(result.contentType)}`,
    { provider: provider.name, metadata: { sceneId, prompt, seed: result.seed } }
  );

  // Generate a small thumbnail for the storyboard grid.
  let thumbUrl: string | null = null;
  try {
    const sharp = (await import("sharp")).default;
    const thumb = await sharp(result.data)
      .resize({ width: 480, height: 270, fit: "cover" })
      .png()
      .toBuffer();
    const thumbAsset = await saveAsset(project.userId, projectId, "THUMBNAIL", thumb, "image/png", `thumb-scene-${String(scene.sceneNumber).padStart(2, "0")}.png`, {
      provider: "local",
      metadata: { sceneId },
    });
    thumbUrl = thumbAsset.url;
  } catch {
    thumbUrl = null;
  }

  await prisma.scene.update({
    where: { id: sceneId },
    data: {
      status: "GENERATED",
      imageUrl: asset.url,
      seed: result.seed,
      providerUsed: provider.name,
      error: null,
    },
  });

  return { asset, thumbUrl, seed: result.seed };
}

export async function upscaleSceneImage(projectId: string, sceneId: string) {
  const scene = await prisma.scene.findUniqueOrThrow({ where: { id: sceneId } });
  if (!scene.imageUrl) throw new Error("Scene has no image");
  const asset = await prisma.asset.findUnique({ where: { id: scene.imageUrl.split("/").pop()! } });
  if (!asset || !asset.storageKey) throw new Error("Image asset not found");
  const storage = await import("@/lib/storage").then((m) => m.getStorage());
  const data = await storage.get(asset.storageKey);
  if (!data) throw new Error("Image data not found");

  const provider = getImageProvider();
  const upscaled = provider.upscale ? await provider.upscale(data, "image/png") : { data, contentType: "image/png" };

  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const newAsset = await saveAsset(project.userId, projectId, "IMAGE", upscaled.data, upscaled.contentType, `upscaled-scene-${String(scene.sceneNumber).padStart(2, "0")}.png`, {
    provider: "upscale",
  });
  await prisma.scene.update({ where: { id: sceneId }, data: { imageUrl: newAsset.url } });
  return newAsset;
}

function extFor(contentType: string): string {
  return contentType.includes("webp") ? "webp" : contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
}
