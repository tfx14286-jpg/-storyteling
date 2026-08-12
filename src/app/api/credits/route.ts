import { NextResponse } from "next/server";
import { requireRouteUser, handleApiError } from "@/lib/auth/route";
import { prisma } from "@/lib/db";
import { addCredits } from "@/services/credits";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const transactions = await prisma.creditTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ credits: user.credits, transactions });
  } catch (e) {
    return handleApiError(e);
  }
}

// Credit purchase — payment gateway integration point (Stripe/Xendit/etc).
// Currently credits are granted instantly; the gateway hook goes here.
export async function POST(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const body = (await request.json().catch(() => ({}))) as { pack?: number };
    const packs = [500, 1100, 3000, 6500, 14000];
    const amount = packs.find((p) => p === Number(body.pack));
    if (!amount) {
      return NextResponse.json({ error: "Invalid credit pack" }, { status: 400 });
    }
    await addCredits(user.id, amount, "PURCHASE", `Purchased ${amount} credits`);
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return NextResponse.json({ credits: updated.credits });
  } catch (e) {
    return handleApiError(e);
  }
}
