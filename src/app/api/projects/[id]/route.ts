import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRouteUser, handleApiError, ApiError } from "@/lib/auth/route";

async function ownProject(request: Request, projectId: string) {
  const user = await requireRouteUser(request);
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== user.id) throw new ApiError(404, "Project not found");
  return { user, project };
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { user } = await ownProject(request, id);
    const project = await prisma.project.findUniqueOrThrow({
      where: { id },
      include: {
        scenes: { orderBy: { order: "asc" } },
        characters: true,
        environments: true,
        settings: true,
        subtitles: true,
        audioTracks: true,
      },
    });
    const recentJobs = await prisma.generationJob.findMany({
      where: { projectId: id, status: { in: ["QUEUED", "ACTIVE", "RETRY"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    const renderJobs = await prisma.renderJob.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    return NextResponse.json({ project, recentJobs, renderJobs, credits: user.credits });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await ownProject(request, id);
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
