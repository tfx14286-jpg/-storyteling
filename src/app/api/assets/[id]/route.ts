import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { toArrayBuffer } from "@/lib/buffer";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) return new NextResponse("Not found", { status: 404 });

  // Enforce ownership: require the session user to own the asset (or the project).
  const store = await import("next/headers").then((m) => m.cookies());
  const token = (await store).get("sm_session")?.value;
  let ownerId: string | null = null;
  if (token) {
    const session = await prisma.session.findUnique({ where: { token } });
    if (session && session.expiresAt > new Date()) ownerId = session.userId;
  }
  if (ownerId && ownerId !== asset.userId) {
    const project = asset.projectId
      ? await prisma.project.findUnique({ where: { id: asset.projectId } })
      : null;
    if (!project || project.userId !== ownerId) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }
  if (!ownerId && asset.type !== "RENDER") {
    // Render outputs may be shared via signed link later; everything else needs auth.
    return new NextResponse("Forbidden", { status: 403 });
  }

  const storage = getStorage();
  const buf = asset.storageKey ? await storage.get(asset.storageKey) : null;
  if (!buf) return new NextResponse("Not found", { status: 404 });

  const metadata = (asset.metadata as Record<string, string> | null) ?? {};
  return new NextResponse(toArrayBuffer(buf), {
    headers: {
      "Content-Type": metadata.contentType || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
