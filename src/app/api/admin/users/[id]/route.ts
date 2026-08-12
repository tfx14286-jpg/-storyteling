import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRouteUser, handleApiError } from "@/lib/auth/route";
import { adminUserActionSchema } from "@/lib/validation";
import { addCredits } from "@/services/credits";

export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireRouteUser(request);
    if (admin.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));
    const parsed = adminUserActionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    const { action, credits, description } = parsed.data;

    switch (action) {
      case "disable":
        await prisma.user.update({ where: { id }, data: { disabled: true } });
        break;
      case "enable":
        await prisma.user.update({ where: { id }, data: { disabled: false } });
        break;
      case "add_credits":
        await addCredits(id, credits ?? 0, "ADMIN", description || "Admin credit adjustment");
        break;
      case "refund_credits":
        await addCredits(id, credits ?? 0, "REFUND", description || "Admin refund");
        break;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
