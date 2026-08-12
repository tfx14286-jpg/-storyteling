import "server-only";
import { prisma } from "@/lib/db";

export async function hasCredits(userId: string, amount: number): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return !!user && user.credits >= amount;
}

export async function spendCredits(
  userId: string,
  amount: number,
  description: string,
  projectId?: string
): Promise<{ ok: boolean; remaining: number; error?: string }> {
  if (amount <= 0) return { ok: true, remaining: (await prisma.user.findUnique({ where: { id: userId } }))?.credits ?? 0 };
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    if (user.credits < amount) return { ok: false, remaining: user.credits, error: "Insufficient credits" };
    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
    });
    await tx.creditTransaction.create({
      data: {
        userId,
        projectId,
        amount: -amount,
        type: "USAGE",
        description,
      },
    });
    return { ok: true, remaining: updated.credits };
  });
  return result;
}

export async function addCredits(
  userId: string,
  amount: number,
  type: "PURCHASE" | "REFUND" | "ADMIN" | "BONUS",
  description: string,
  projectId?: string
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: amount } },
  });
  await prisma.creditTransaction.create({
    data: { userId, projectId, amount, type, description },
  });
  return user;
}

export async function getCreditCosts(): Promise<Record<string, number>> {
  const settings = await prisma.aIProvider.findFirst({
    where: { category: "CREDITS" },
  });
  const base = settings?.config as Record<string, number> | null | undefined;
  return base ?? {};
}
