import "server-only";
import { prisma } from "@/lib/db";
import { saveAsset } from "@/services/assets";
import { getVoiceDuration } from "@/services/timeline";

function srtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec - Math.floor(sec)) * 1000);
  const p = (n: number, l: number) => String(n).padStart(l, "0");
  return `${p(h, 2)}:${p(m, 2)}:${p(s, 2)},${p(ms, 3)}`;
}

function vttTime(sec: number): string {
  const t = srtTime(sec).replace(",", ".");
  return t;
}

export async function buildTimeline(projectId: string): Promise<{ scenes: { sceneId: string; sceneNumber: number; start: number; end: number; narration: string }[]; total: number }> {
  const scenes = await prisma.scene.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
  const entries = [];
  let cursor = 0;
  for (const scene of scenes) {
    const voiceDur = await getVoiceDuration(scene);
    const dur = Math.max(scene.duration, voiceDur);
    entries.push({
      sceneId: scene.id,
      sceneNumber: scene.sceneNumber,
      start: cursor,
      end: cursor + dur,
      narration: scene.narration,
    });
    cursor += dur;
  }
  return { scenes: entries, total: cursor };
}

export async function generateSubtitles(projectId: string, format: "SRT" | "VTT" = "SRT") {
  const { scenes, total } = await buildTimeline(projectId);
  let content = "";
  if (format === "SRT") {
    content = scenes
      .map((s, i) => `${i + 1}\n${srtTime(s.start)} --> ${srtTime(s.end)}\n${s.narration}\n`)
      .join("\n");
  } else {
    content = `WEBVTT\n\n${scenes
      .map((s) => `${vttTime(s.start)} --> ${vttTime(s.end)}\n${s.narration}\n`)
      .join("\n")}`;
  }

  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const asset = await saveAsset(project.userId, projectId, "SUBTITLE", Buffer.from(content, "utf8"), "text/plain", format === "SRT" ? "subtitles.srt" : "subtitles.vtt", {
    provider: "local",
    metadata: { format, totalDuration: total },
  });

  await prisma.subtitle.create({
    data: { projectId, lang: project.language, format, content, url: asset.url },
  });

  return { content, url: asset.url, total };
}
