import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRouteUser, handleApiError, ApiError } from "@/lib/auth/route";
import { updateSceneSchema, regenerateSceneSchema } from "@/lib/validation";
import { enqueueJob } from "@/lib/queue";
import { registerAllHandlers } from "@/lib/queue/handlers";
import { spendCredits, hasCredits } from "@/services/credits";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireRouteUser(request);
    const scene = await prisma.scene.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!scene || scene.project.userId !== user.id) throw new ApiError(404, "Scene not found");

    const body = await request.json().catch(() => ({}));
    const parsed = updateSceneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const data = parsed.data;
    await prisma.scene.update({
      where: { id },
      data: {
        ...(data.narration !== undefined ? { narration: data.narration } : {}),
        ...(data.visualDescription !== undefined ? { visualDescription: data.visualDescription } : {}),
        ...(data.duration !== undefined ? { duration: data.duration } : {}),
        ...(data.cameraMovement !== undefined ? { cameraMovement: data.cameraMovement } : {}),
        ...(data.shotType !== undefined ? { shotType: data.shotType } : {}),
        ...(data.animation !== undefined ? { animation: data.animation } : {}),
        ...(data.soundEffect !== undefined ? { soundEffect: data.soundEffect } : {}),
        ...(data.transition !== undefined ? { transition: data.transition } : {}),
        ...(data.background !== undefined ? { background: data.background } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireRouteUser(request);
    const scene = await prisma.scene.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!scene || scene.project.userId !== user.id) throw new ApiError(404, "Scene not found");

    const body = await request.json().catch(() => ({}));
    const parsed = regenerateSceneSchema.safeParse(body);
    const part = parsed.success ? parsed.data.part : "image";

    const costMap: Record<string, number> = { image: 10, animation: 5, voice: 5, scene: 10, prompt: 2 };
    const cost = costMap[part] ?? 5;
    if (!(await hasCredits(user.id, cost))) {
      return NextResponse.json({ error: "Kredit tidak mencukupi" }, { status: 402 });
    }
    await spendCredits(user.id, cost, `Regenerate ${part} scene ${scene.sceneNumber}`, scene.projectId).catch(() => undefined);

    registerAllHandlers();
    let job;
    switch (part) {
      case "voice":
        job = await enqueueJob({ type: "tts_generation", projectId: scene.projectId, sceneId: id });
        break;
      case "animation":
        job = await enqueueJob({ type: "video_generation", projectId: scene.projectId, sceneId: id });
        break;
      case "scene":
        job = await enqueueJob({ type: "image_generation", projectId: scene.projectId, sceneId: id, payload: { regenerateAll: true } });
        break;
      default:
        job = await enqueueJob({ type: "image_generation", projectId: scene.projectId, sceneId: id });
    }

    return NextResponse.json({ jobId: job.id });
  } catch (e) {
    return handleApiError(e);
  }
}
