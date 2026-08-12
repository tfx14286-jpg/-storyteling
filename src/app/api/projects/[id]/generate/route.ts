import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRouteUser, handleApiError, ApiError } from "@/lib/auth/route";
import { enqueueJob, updateJob } from "@/lib/queue";
import { registerAllHandlers } from "@/lib/queue/handlers";
import { spendCredits, hasCredits } from "@/services/credits";

export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireRouteUser(request);
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project || project.userId !== user.id) throw new ApiError(404, "Project not found");

    const cost = 5 + 10; // script + first image pass (approximate; real billing per asset)
    if (!(await hasCredits(user.id, 5))) {
      return NextResponse.json({ error: "Kredit tidak mencukupi. Tambah kredit terlebih dahulu." }, { status: 402 });
    }
    const spend = await spendCredits(user.id, 5, "Script + storyboard generation", id);
    if (!spend.ok) return NextResponse.json({ error: spend.error }, { status: 402 });
    void cost;

    registerAllHandlers();
    await prisma.project.update({ where: { id }, data: { error: null, status: "RENDERING", progress: 0 } });
    const job = await enqueueJob({ type: "full_pipeline", projectId: id });

    return NextResponse.json({ jobId: job.id });
  } catch (e) {
    return handleApiError(e);
  }
}

// Progress polling endpoint (SSE)
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireRouteUser(request);
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project || project.userId !== user.id) throw new ApiError(404, "Project not found");

    const encoder = new TextEncoder();
    let closed = false;

    const getRenderUrl = async (): Promise<string | null> => {
      const asset = await prisma.asset.findFirst({
        where: { projectId: id, type: "RENDER" },
        orderBy: { createdAt: "desc" },
      });
      return asset?.url ?? null;
    };

    const send = async (data: object) => {
      if (closed) return;
      const body = `data: ${JSON.stringify(data)}\n\n`;
      try {
        controller.enqueue(encoder.encode(body));
      } catch {
        /* stream closed */
      }
    };

    let controller: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
        void (async () => {
          let lastJobId = "";
          let lastMsg = "";
          while (!closed) {
            const latest = await prisma.generationJob.findFirst({
              where: { projectId: id },
              orderBy: { createdAt: "desc" },
            });
            const p = await prisma.project.findUnique({ where: { id } });
            const message =
              (latest?.status === "ACTIVE" || latest?.status === "QUEUED" || latest?.status === "RETRY")
                ? ((latest.result as { message?: string } | null)?.message ?? "Working…")
                : lastMsg;
            const jobId = latest?.id ?? "";
            const jobStatus = latest?.status ?? null;
            const jobProgress = latest?.progress ?? 0;
            if (jobId !== lastJobId || message !== lastMsg || (p?.progress ?? 0) % 5 === 0) {
              await send({
                status: p?.status,
                progress: p?.progress ?? 0,
                stage: latest?.type ?? null,
                jobId,
                jobStatus,
                jobProgress,
                message,
                renderUrl: await getRenderUrl(),
              });
              lastJobId = jobId;
              lastMsg = message;
            }
            await new Promise((r) => setTimeout(r, 1500));
            const jobTerminal = latest?.status === "COMPLETED" || latest?.status === "FAILED";
            const projectTerminal = p?.status === "COMPLETED" || p?.status === "FAILED";
            if (projectTerminal && jobTerminal) {
              await send({
                status: p.status,
                progress: p.progress,
                message: p.status === "COMPLETED" ? "Completed" : p.error,
                renderUrl: await getRenderUrl(),
                done: true,
              });
              closed = true;
              try {
                controller.close();
              } catch {
                /* already closed */
              }
              break;
            }
          }
        })();
      },
      cancel() {
        closed = true;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export { updateJob };
