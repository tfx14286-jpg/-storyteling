import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createProjectSchema } from "@/lib/validation";
import { requireRouteUser, handleApiError } from "@/lib/auth/route";

export async function GET(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { scenes: true } },
      },
    });
    return NextResponse.json({
      projects: projects.map((p) => ({
        ...p,
        sceneCount: p._count.scenes,
      })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRouteUser(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request tidak valid" }, { status: 400 });
    }
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validasi gagal" },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        title: data.title,
        description: data.description,
        language: data.language,
        durationSec: data.durationSec,
        aspectRatio: data.aspectRatio,
        style: data.style,
        voice: data.voice,
        tone: data.tone,
      },
    });
    await prisma.projectSettings.create({ data: { projectId: project.id } });
    return NextResponse.json({ project });
  } catch (e) {
    return handleApiError(e);
  }
}
