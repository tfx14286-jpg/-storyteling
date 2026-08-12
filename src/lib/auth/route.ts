import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { SessionUser } from "./session";

export async function routeUser(request: Request): Promise<SessionUser | null> {
  const cookie = request.headers.get("cookie") || "";
  const token = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("sm_session="))
    ?.split("=")
    .slice(1)
    .join("=");
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || session.user.disabled) return null;
  const u = session.user;
  return { id: u.id, email: u.email, name: u.name, role: u.role, credits: u.credits };
}

export async function requireRouteUser(request: Request): Promise<SessionUser> {
  const user = await routeUser(request);
  if (!user) throw new ApiError(401, "Unauthorized");
  return user;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function handleApiError(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  const message = e instanceof Error ? e.message : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}
