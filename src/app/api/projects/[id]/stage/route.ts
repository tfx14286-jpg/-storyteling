import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRouteUser, handleApiError, ApiError } from "@/lib/auth/route";
import { enqueueJob } from "@/lib/queue";
import { registerAllHandlers } from "@/lib/queue/handlers";
import { spendCredits, hasCredits } from "@/services/credits";

export const dynamic = "force-dynamic";

const STAGE_COST: Record<string, number> = {
  script: 5,
  images: 10,
  voice: 5,
  render: 20,
  quality: 3,
  thumbnail: 5,
};

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireRouteUser(request);
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project || project.userId !== user.id) throw new ApiError(404, "Project not found");

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      /* default */
    }
    const stage = String(body.stage ?? "script");
    const cost = STAGE_COST[stage] ?? 5;

    if (!(await hasCredits(user.id, cost))) {
      return NextResponse.json({ error: "Kredit tidak mencukupi" }, { status: 402 });
    }
    await spendCredits(user.id, cost, `Stage ${stage}`, id).catch(() => undefined);

    registerAllHandlers();
    let job;
    switch (stage) {
      case "images":
        job = await enqueueJob({ type: "image_generation", projectId: id });
        break;
      case "voice":
        job = await enqueueJob({ type: "tts_generation", projectId: id });
        break;
      case "render":
        job = await enqueueJob({ type: "render", projectId: id, payload: body });
        await prisma.renderJob.create({
          data: { projectId: id, status: "QUEUED", resolution: String(body.resolution ?? "1080p"), fps: Number(body.fps ?? 30) },
        });
        break;
      case "quality":
        job = await enqueueJob({ type: "quality_check", projectId: id });
        break;
      case "thumbnail":
        job = await enqueueJob({ type: "thumbnail_generation", projectId: id });
        break;
      default:
        job = await enqueueJob({ type: "script_generation", projectId: id });
    }

    return NextResponse.json({ jobId: job.id });
  } catch (e) {
    return handleApiError(e);
  }
}
