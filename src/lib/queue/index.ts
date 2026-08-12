import "server-only";
import { prisma } from "@/lib/db";

export type JobType =
  | "full_pipeline"
  | "script_generation"
  | "storyboard_generation"
  | "character_generation"
  | "image_generation"
  | "video_generation"
  | "tts_generation"
  | "subtitle_generation"
  | "audio_mix"
  | "quality_check"
  | "thumbnail_generation"
  | "render";

export interface JobContext {
  update(progress: number, message: string): Promise<void>;
  fail(message: string): Promise<void>;
}

export type JobHandler = (jobId: string, ctx: JobContext) => Promise<void>;

const handlers = new Map<string, JobHandler>();

export function registerHandler(type: string, fn: JobHandler) {
  handlers.set(type, fn);
}

export interface EnqueueInput {
  type: JobType;
  projectId?: string;
  sceneId?: string;
  payload?: Record<string, unknown>;
}

export async function enqueueJob(input: EnqueueInput) {
  const job = await prisma.generationJob.create({
    data: {
      type: input.type,
      projectId: input.projectId,
      sceneId: input.sceneId,
      status: "QUEUED",
      result: (input.payload ?? {}) as object,
    },
  });
  // Fire-and-forget background execution (in-process worker).
  void runJob(job.id);
  return job;
}

const RUNNING = new Set<string>();
const lastProgressUpdate = new Map<string, number>();

async function runJob(jobId: string): Promise<void> {
  if (RUNNING.has(jobId)) return;
  RUNNING.add(jobId);

  const ctx: JobContext = {
    async update(progress, message) {
      const now = Date.now();
      const last = lastProgressUpdate.get(jobId) ?? 0;
      if (now - last < 400) return;
      lastProgressUpdate.set(jobId, now);
      await prisma.generationJob
        .update({
          where: { id: jobId },
          data: { progress: Math.max(0, Math.min(100, progress)), status: "ACTIVE", result: { ...(await getResult(jobId)), message } },
        })
        .catch(() => undefined);
    },
    async fail(message) {
      await prisma.generationJob
        .update({
          where: { id: jobId },
          data: { status: "FAILED", error: message, completedAt: new Date() },
        })
        .catch(() => undefined);
    },
  };

  try {
    let job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
    const handler = handlers.get(job.type);
    if (!handler) {
      await ctx.fail(`No handler registered for ${job.type}`);
      return;
    }
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "ACTIVE" },
    });

    // Retry loop: 3 attempts.
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await handler(jobId, ctx);
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { status: "COMPLETED", progress: 100, completedAt: new Date(), retryCount: attempt },
        });
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { status: "RETRY", error: lastErr.message, retryCount: attempt + 1 },
        });
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
    if (lastErr) {
      await ctx.fail(lastErr.message);
      // Mark project failed if this is a project-level job.
      job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
      if (job.projectId && !job.sceneId) {
        await prisma.project
          .update({ where: { id: job.projectId }, data: { status: "FAILED", error: lastErr.message } })
          .catch(() => undefined);
      }
    }
  } catch (e) {
    await ctx.fail(e instanceof Error ? e.message : String(e)).catch(() => undefined);
  } finally {
    RUNNING.delete(jobId);
    lastProgressUpdate.delete(jobId);
  }
}

async function getResult(jobId: string): Promise<Record<string, unknown>> {
  const j = await prisma.generationJob.findUnique({ where: { id: jobId } });
  return (j?.result ?? {}) as Record<string, unknown>;
}

export async function updateJob(jobId: string, data: { progress?: number; message?: string; status?: string }) {
  await prisma.generationJob
    .update({
      where: { id: jobId },
      data: {
        ...(data.progress !== undefined ? { progress: data.progress } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.message ? { result: { ...(await getResult(jobId)), message: data.message } } : {}),
      },
    })
    .catch(() => undefined);
}
