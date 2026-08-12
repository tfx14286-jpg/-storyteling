import { NextResponse } from "next/server";
import { requireRouteUser, handleApiError } from "@/lib/auth/route";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function isAdmin(request: Request) {
  const user = await requireRouteUser(request);
  if (user.role !== "ADMIN") {
    return null;
  }
  return user;
}

export async function GET(request: Request) {
  try {
    if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only" }, { status: 403 });
    const [users, projects, jobs, renderJobs, failedJobs] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.project.count(),
      prisma.generationJob.count(),
      prisma.renderJob.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.generationJob.count({ where: { status: "FAILED" } }),
    ]);
    const userList = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, email: true, name: true, role: true, credits: true, disabled: true, createdAt: true, _count: { select: { projects: true } } },
    });
    return NextResponse.json({
      counts: { users: users.length, projects, jobs, failedJobs },
      userList,
      renderJobs,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

