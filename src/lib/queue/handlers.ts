import "server-only";
import { prisma } from "@/lib/db";
import { registerHandler, updateJob, type JobContext } from "@/lib/queue";
import { generateScriptForProject } from "@/services/script";
import { generateSceneImage } from "@/services/images";
import { generateVoiceForScene, generateVoiceForProject } from "@/services/voice";
import { generateSubtitles } from "@/services/subtitle";
import { generateMusicForProject } from "@/services/audio";
import { renderProject } from "@/services/render";
import { runQualityCheck } from "@/services/quality";

export function registerAllHandlers() {
  registerHandler("full_pipeline", async (jobId, ctx) => {
    const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
    const projectId = job.projectId;
    if (!projectId) throw new Error("Pipeline requires projectId");
    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });

    const stage = async (label: string, p: number, fn: () => Promise<unknown>) => {
      await ctx.update(p, label);
      await prisma.project.update({ where: { id: projectId }, data: { progress: p } }).catch(() => undefined);
      await fn();
    };

    if (project.status === "DRAFT" || !project.script) {
      await stage("Generating script & storyboard…", 8, () => generateScriptForProject(projectId));
    }
    await stage("Generating scene images…", 22, async () => {
      const scenes = await prisma.scene.findMany({ where: { projectId }, orderBy: { order: "asc" } });
      for (const scene of scenes) {
        if (scene.status !== "GENERATED") {
          await generateSceneImage(projectId, scene.id).catch(() => undefined);
        }
      }
      await prisma.project.update({ where: { id: projectId }, data: { status: "IMAGES" } });
    });
    await stage("Generating voice-over…", 50, () => generateVoiceForProject(projectId));
    await stage("Generating subtitles…", 62, () => generateSubtitles(projectId, "SRT"));
    await stage("Adding music & sound effects…", 70, () => generateMusicForProject(projectId));
    await stage("Running quality check…", 78, () => runQualityCheck(projectId).catch(() => undefined));
    await stage("Rendering final video…", 85, () =>
      renderProject(projectId, {
        onProgress: (p, msg) => void updateJob(jobId, { progress: p, message: msg }),
      })
    );
  });

  registerHandler("script_generation", async (jobId, ctx) => {
    const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
    if (!job.projectId) throw new Error("Missing projectId");
    await ctx.update(10, "Writing script…");
    await generateScriptForProject(job.projectId);
    await ctx.update(100, "Storyboard ready");
  });

  registerHandler("image_generation", async (jobId, ctx) => {
    const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
    if (!job.projectId) throw new Error("Missing projectId");
    const scenes = job.sceneId
      ? [{ id: job.sceneId }]
      : await prisma.scene.findMany({ where: { projectId: job.projectId }, orderBy: { order: "asc" } });
    let done = 0;
    for (const scene of scenes) {
      await generateSceneImage(job.projectId, scene.id);
      done += 1;
      await ctx.update(Math.round((done / scenes.length) * 100), `Scene ${done}/${scenes.length} image generated`);
    }
    if (!job.sceneId) {
      await prisma.project.update({ where: { id: job.projectId }, data: { status: "IMAGES" } });
    }
  });

  registerHandler("video_generation", async (jobId, ctx) => {
    const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
    if (!job.projectId) throw new Error("Missing projectId");
    const scenes = job.sceneId
      ? [{ id: job.sceneId }]
      : await prisma.scene.findMany({ where: { projectId: job.projectId }, orderBy: { order: "asc" } });
    let done = 0;
    for (const scene of scenes) {
      await prisma.scene.update({
        where: { id: scene.id },
        data: { status: "ANIMATED" },
      });
      done += 1;
      await ctx.update(Math.round((done / scenes.length) * 100), `Scene ${done}/${scenes.length} motion assigned`);
    }
    if (!job.sceneId) {
      await prisma.project.update({ where: { id: job.projectId }, data: { status: "ANIMATED" } });
    }
  });

  registerHandler("tts_generation", async (jobId, ctx) => {
    const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
    if (!job.projectId) throw new Error("Missing projectId");
    await ctx.update(10, "Synthesizing voice…");
    if (job.sceneId) {
      await generateVoiceForScene(job.projectId, job.sceneId);
    } else {
      await generateVoiceForProject(job.projectId);
    }
    await ctx.update(100, "Voice ready");
  });

  registerHandler("subtitle_generation", async (jobId, ctx) => {
    const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
    if (!job.projectId) throw new Error("Missing projectId");
    await ctx.update(20, "Building subtitles…");
    await generateSubtitles(job.projectId, "SRT");
    await ctx.update(100, "Subtitles ready");
  });

  registerHandler("audio_mix", async (jobId, ctx) => {
    const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
    if (!job.projectId) throw new Error("Missing projectId");
    await ctx.update(10, "Composing music & SFX…");
    await generateMusicForProject(job.projectId);
    await ctx.update(100, "Audio ready");
  });

  registerHandler("quality_check", async (jobId, ctx) => {
    const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
    if (!job.projectId) throw new Error("Missing projectId");
    await ctx.update(10, "Running quality control…");
    const report = await runQualityCheck(job.projectId);
    await ctx.update(100, `Quality score ${report.score}/100`);
  });

  registerHandler("thumbnail_generation", async (jobId, ctx) => {
    const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
    if (!job.projectId) throw new Error("Missing projectId");
    await ctx.update(10, "Generating thumbnail…");
    await generateThumbnail(job.projectId);
    await ctx.update(100, "Thumbnail ready");
  });

  registerHandler("render", async (jobId, ctx) => {
    const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
    if (!job.projectId) throw new Error("Missing projectId");
    await prisma.project.update({ where: { id: job.projectId }, data: { status: "RENDERING" } });
    const config = (job.result ?? {}) as Record<string, unknown>;
    await renderProject(job.projectId, {
      resolution: String(config.resolution ?? "1080p"),
      fps: Number(config.fps ?? 30),
      aspectRatio: String(config.aspectRatio ?? "16:9"),
      subtitleEnabled: config.subtitleEnabled !== false,
      onProgress: (p, msg) => void updateJob(jobId, { progress: p, message: msg }),
    });
    await ctx.update(100, "Render complete");
  });
}

async function generateThumbnail(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const scenes = await prisma.scene.findMany({ where: { projectId }, orderBy: { order: "asc" } });
  const firstWithImage = scenes.find((s) => s.imageUrl);
  if (!firstWithImage?.imageUrl) return null;
  const asset = await prisma.asset.findUnique({ where: { id: firstWithImage.imageUrl.split("/").pop()! } });
  if (!asset?.storageKey) return null;
  const storage = await import("@/lib/storage").then((m) => m.getStorage());
  const img = await storage.get(asset.storageKey);
  if (!img) return null;
  const sharp = (await import("sharp")).default;
  const thumb = await sharp(img).resize({ width: 640, height: 360, fit: "cover" }).jpeg({ quality: 82 }).toBuffer();
  const { saveAsset } = await import("@/services/assets");
  const thumbAsset = await saveAsset(project.userId, projectId, "THUMBNAIL", thumb, "image/jpeg", "thumbnail.jpg", { provider: "local" });
  await prisma.project.update({ where: { id: projectId }, data: { thumbnailUrl: thumbAsset.url } });
  return thumbAsset.url;
}
