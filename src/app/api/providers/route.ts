import { NextResponse } from "next/server";
import { requireRouteUser, handleApiError } from "@/lib/auth/route";
import { providerStatus } from "@/lib/ai/registry";
import { prisma } from "@/lib/db";
import { decryptSecret, keyHint } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireRouteUser(request);
    const status = await providerStatus();

    const stored = await prisma.aIProvider.findMany({
      orderBy: [{ category: "asc" }, { priority: "asc" }],
      include: { apiKeys: true },
    });
    return NextResponse.json({
      ...status,
      stored: stored.map((p) => ({
        id: p.id,
        category: p.category,
        name: p.name,
        provider: p.provider,
        isActive: p.isActive,
        isFallback: p.isFallback,
        priority: p.priority,
        config: p.config,
        keys: p.apiKeys.map((k) => ({ id: k.id, hint: k.keyHint, lastUsedAt: k.lastUsedAt })),
      })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRouteUser(request);
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    const { category, name, provider, isActive, isFallback, priority, config, apiKey } = body;

    const { encryptSecret } = await import("@/lib/crypto");
    const record = await prisma.aIProvider.create({
      data: {
        category,
        name,
        provider,
        isActive: Boolean(isActive),
        isFallback: Boolean(isFallback),
        priority: Number(priority) || 0,
        config: config ? { ...(config as object) } : undefined,
      },
    });
    if (apiKey) {
      await prisma.apiKey.create({
        data: {
          providerId: record.id,
          keyEncrypted: encryptSecret(String(apiKey)),
          keyHint: keyHint(String(apiKey)),
        },
      });
    }
    return NextResponse.json({ ok: true, id: record.id });
  } catch (e) {
    return handleApiError(e);
  }
}
