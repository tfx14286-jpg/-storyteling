import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { runFfmpeg } from "@/lib/render/ffmpeg";
import { getVoiceDuration } from "@/services/timeline";
import { decodeWav, encodeWav, mixTracks, applyFadeInOut, silence } from "@/lib/audio/wav";
import { saveAsset } from "@/services/assets";
import { RESOLUTIONS, type CAMERA_MOVEMENTS } from "@/lib/constants";
import type { Scene } from "@/generated/prisma/client";

export const TRANSITION_MAP: Record<string, string> = {
  Cut: "fade",
  Fade: "fade",
  Crossfade: "fade",
  Zoom: "circleopen",
  Slide: "slideleft",
  Blur: "dissolve",
  Cinematic: "fadeblack",
};

function zoompanExpr(camera: string, frames: number, on: string): string {
  switch (camera) {
    case "Zoom In":
      return `z='min(zoom+0.0025,1.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
    case "Zoom Out":
      return `z='if(lte(zoom,1.0),1.5,max(1.001,zoom-0.0025))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
    case "Pan Left":
      return `z='1.18':x='(iw-iw/zoom)*(1-${on}/${frames})':y='(ih-ih/zoom)/2'`;
    case "Pan Right":
      return `z='1.18':x='(iw-iw/zoom)*(${on}/${frames})':y='(ih-ih/zoom)/2'`;
    case "Tilt Up":
      return `z='1.18':y='(ih-ih/zoom)*(1-${on}/${frames})':x='(iw-iw/zoom)/2'`;
    case "Tilt Down":
      return `z='1.18':y='(ih-ih/zoom)*(${on}/${frames})':x='(iw-iw/zoom)/2'`;
    case "Dolly In":
      return `z='min(zoom+0.003,1.6)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
    case "Dolly Out":
      return `z='if(lte(zoom,1.0),1.6,max(1.001,zoom-0.003))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
    case "Orbit":
      return `z='1.12':x='(iw-iw/zoom)/2+iw*0.03*sin(2*PI*${on}/${frames})':y='(ih-ih/zoom)/2+ih*0.03*cos(2*PI*${on}/${frames})'`;
    case "Tracking":
      return `z='1.14':x='(iw-iw/zoom)*(${on}/${frames})':y='(ih-ih/zoom)*0.5+ih*0.01*sin(2*PI*${on}/${frames})'`;
    case "Shake":
      return `z='1.08':x='(iw-iw/zoom)/2+iw*0.006*sin(${on}*20)':y='(ih-ih/zoom)/2+ih*0.006*cos(${on}*17)'`;
    case "Parallax":
      return `z='min(zoom+0.002,1.4)':x='(iw-iw/zoom)*0.5+iw*0.03*sin(2*PI*${on}/${frames})':y='(ih-ih/zoom)/2'`;
    case "Static":
    default:
      return "";
  }
}

function resFor(value: string) {
  return RESOLUTIONS.find((r) => r.value === value) ?? RESOLUTIONS[1];
}

async function renderSceneClip(
  scene: Scene,
  imageBuffer: Buffer,
  w: number,
  h: number,
  fps: number,
  durationSec: number,
  outPath: string
): Promise<void> {
  const tmpInput = path.join(os.tmpdir(), `sm-img-${scene.id}.png`);
  await fs.promises.writeFile(tmpInput, imageBuffer);
  const frames = Math.max(1, Math.round(durationSec * fps));
  const cam = (scene.cameraMovement || "Static") as (typeof CAMERA_MOVEMENTS)[number];

  if (cam === "Static" || cam === "Parallax") {
    const expr = cam === "Parallax" ? zoompanExpr("Parallax", frames, "on") : "";
    const vf = expr
      ? `scale=${w * 2}:${h * 2}:force_original_aspect_ratio=increase,crop=${w * 2}:${h * 2},zoompan=${expr}:d=${frames}:fps=${fps}:s=${w}x${h}`
      : `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`;
    // A still image only produces 1 frame unless the input is looped.
    const loop = expr ? [] : ["-loop", "1"];
    await runFfmpeg([
      "-y", ...loop, "-i", tmpInput,
      "-vf", vf,
      "-frames:v", String(frames),
      "-r", String(fps),
      "-pix_fmt", "yuv420p",
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "20",
      "-an",
      outPath,
    ]);
    return;
  }

  const expr = zoompanExpr(cam, frames, "on");
  await runFfmpeg([
    "-y", "-i", tmpInput,
    "-vf", `scale=${w * 2}:${h * 2}:force_original_aspect_ratio=increase,crop=${w * 2}:${h * 2},zoompan=${expr}:d=${frames}:fps=${fps}:s=${w}x${h}`,
    "-frames:v", String(frames),
    "-r", String(fps),
    "-pix_fmt", "yuv420p",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "20",
    "-an",
    outPath,
  ]);
}

function transitionDuration(transition: string | null): number {
  if (!transition || transition === "Cut") return 0;
  return 0.5;
}

async function readAssetBytes(url: string | null): Promise<Buffer | null> {
  if (!url) return null;
  const id = url.split("/").pop();
  if (!id) return null;
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset?.storageKey) return null;
  return getStorage().get(asset.storageKey);
}

export interface RenderOptions {
  resolution?: string;
  fps?: number;
  aspectRatio?: string;
  subtitleEnabled?: boolean;
  watermarkEnabled?: boolean;
  onProgress?: (progress: number, message: string) => void;
}

export async function renderProject(projectId: string, opts: RenderOptions = {}): Promise<string> {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const scenes = await prisma.scene.findMany({ where: { projectId }, orderBy: { order: "asc" } });
  if (scenes.length === 0) throw new Error("Project has no scenes");

  const settings = await prisma.projectSettings.upsert({ where: { projectId }, create: { projectId }, update: {} });
  const resolution = opts.resolution ?? settings.resolution ?? "1080p";
  const fps = opts.fps ?? settings.fps ?? 30;
  const ratio = opts.aspectRatio ?? project.aspectRatio ?? "16:9";
  const subtitleEnabled = opts.subtitleEnabled ?? settings.subtitleEnabled ?? true;

  const res = resFor(resolution);
  const outW = ratio === "9:16" ? res.height : ratio === "1:1" ? Math.round((res.width * res.height) / Math.max(res.width, res.height)) : res.width;
  const outH = ratio === "9:16" ? res.width : ratio === "1:1" ? Math.round((res.width * res.height) / Math.max(res.width, res.height)) : res.height;

  const report = (p: number, m: string) => {
    opts.onProgress?.(Math.round(p), m);
    void prisma.renderJob
      .updateMany({
        where: { projectId, status: "RENDERING" },
        data: { progress: Math.round(p) },
      })
      .catch(() => undefined);
    void prisma.project.update({ where: { id: projectId }, data: { progress: Math.round(p) } }).catch(() => undefined);
  };

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "sm-render-"));
  try {
    // Compute scene visual durations (max of scene duration & voice duration).
    const voiceDurs: number[] = [];
    for (const scene of scenes) voiceDurs.push(await getVoiceDuration(scene));
    const durs = scenes.map((s, i) => Math.max(s.duration, voiceDurs[i]));
    const transDurs = scenes.slice(1).map((s) => transitionDuration(s.transition));
    const totalVisual = durs.reduce((a, b) => a + b, 0) - transDurs.reduce((a, b) => a + b, 0);

    report(5, "Rendering scene clipsâ€¦");

    // 1) Render per-scene clips
    const clips: string[] = [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      if (!scene.imageUrl) {
        throw new Error(`Scene ${scene.sceneNumber} has no image. Generate images first.`);
      }
      const img = await readAssetBytes(scene.imageUrl);
      if (!img) throw new Error(`Scene ${scene.sceneNumber} image missing`);
      const clipPath = path.join(workDir, `clip-${String(i + 1).padStart(2, "0")}.mp4`);
      await renderSceneClip(scene, img, outW, outH, fps, durs[i], clipPath);
      clips.push(clipPath);
      report(5 + Math.round(((i + 1) / scenes.length) * 25), `Scene ${i + 1}/${scenes.length} animated`);
    }

    // 2) Concatenate with transitions (xfade)
    report(32, "Assembling timelineâ€¦");
    let videoPath: string;
    if (clips.length === 1) {
      videoPath = path.join(workDir, "video.mp4");
      fs.copyFileSync(clips[0], videoPath);
    } else {
      const filterParts: string[] = [];
      // xfade requires duration > 0; hard cuts (duration 0) would silently drop
      // the incoming clip. Split scenes into groups separated by cuts, run an
      // xfade chain inside each group, then join the groups with concat.
      const groups: { start: number; end: number }[] = [];
      let gs = 0;
      for (let i = 1; i < clips.length; i++) {
        if (transDurs[i - 1] <= 0) {
          groups.push({ start: gs, end: i - 1 });
          gs = i;
        }
      }
      groups.push({ start: gs, end: clips.length - 1 });

      const groupLabels: string[] = [];
      let xIndex = 0;
      let groupNum = 0;
      for (const g of groups) {
        const outLabel = `[s${groupNum}]`;
        if (g.start === g.end) {
          filterParts.push(`[${g.start}:v]setsar=1${outLabel}`);
          groupLabels.push(outLabel);
          groupNum += 1;
          continue;
        }
        let offset = durs[g.start];
        let prevLabel = `[${g.start}:v]`;
        for (let i = g.start; i < g.end; i++) {
          const tDur = transDurs[i];
          const xoff = offset - tDur;
          const map = TRANSITION_MAP[scenes[i + 1].transition || "Cut"] ?? "fade";
          filterParts.push(
            `${prevLabel}[${i + 1}:v]xfade=transition=${map}:duration=${tDur}:offset=${xoff.toFixed(3)}[x${xIndex}]`
          );
          offset = offset + durs[i + 1] - tDur;
          prevLabel = `[x${xIndex}]`;
          xIndex += 1;
        }
        filterParts.push(`${prevLabel}setsar=1${outLabel}`);
        groupLabels.push(outLabel);
        groupNum += 1;
      }

      if (groupLabels.length > 1) {
        filterParts.push(`${groupLabels.join("")}concat=n=${groupLabels.length}:v=1:a=0[concatv]`);
        filterParts.push(`[concatv]format=yuv420p[vout]`);
      } else {
        filterParts.push(`${groupLabels[0]}format=yuv420p[vout]`);
      }
      videoPath = path.join(workDir, "video.mp4");
      await runFfmpeg([
        "-y",
        ...clips.flatMap((c) => ["-i", c]),
        "-filter_complex",
        filterParts.join(";"),
        "-map", "[vout]",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "20",
        videoPath,
      ]);
    }

    report(55, "Mixing voice, music & effectsâ€¦");

    // 3) Audio mix (Node-side WAV mixing)
    // Voice tracks per scene
    const tracks: { data: Float32Array; gain: number; offsetSec: number }[] = [];
    const sampleRate = 44100;
    let cursor = 0;
    const sceneStarts: number[] = [];
    for (let i = 0; i < scenes.length; i++) {
      sceneStarts.push(cursor);
      cursor += durs[i] - (i < durs.length - 1 ? transDurs[i] : 0);
    }
    for (let i = 0; i < scenes.length; i++) {
      const voiceBuf = await readAssetBytes(scenes[i].voiceUrl);
      if (voiceBuf) {
        try {
          const wav = decodeWav(voiceBuf);
          tracks.push({ data: wav.samples, gain: 1.0, offsetSec: sceneStarts[i] });
        } catch {
          /* skip broken voice */
        }
      }
    }

    // Music & SFX from AudioTrack
    const audioTracks = await prisma.audioTrack.findMany({ where: { projectId } });
    for (const t of audioTracks) {
      const buf = await readAssetBytes(t.url);
      if (!buf) continue;
      try {
        const wav = decodeWav(buf);
        let offset = t.startTime || 0;
        if (t.type === "SFX" && t.sceneId) {
          const idx = scenes.findIndex((s) => s.id === t.sceneId);
          if (idx >= 0) offset = sceneStarts[idx];
        }
        tracks.push({ data: wav.samples, gain: t.type === "MUSIC" ? 0.18 : 0.35, offsetSec: offset });
      } catch {
        /* skip */
      }
    }

    // If no voice at all, add silence so the file still has an audio track.
    if (tracks.length === 0) {
      tracks.push({ data: silence(totalVisual), gain: 1, offsetSec: 0 });
    }

    const mixed = mixTracks(tracks, totalVisual + 0.5);
    const mixedFaded = applyFadeInOut(mixed, 0.4);
    const mixPath = path.join(workDir, "mix.wav");
    await fs.promises.writeFile(mixPath, encodeWav(mixedFaded, sampleRate));

    report(70, "Encoding final videoâ€¦");

    // 4) Final mux with optional burned-in subtitles
    let subsPath: string | null = null;
    if (subtitleEnabled) {
      const { scenes: tl, total } = await import("@/services/subtitle").then((m) => m.buildTimeline(projectId));
      void total;
      const srt = tl
        .map((s, i) => {
          const hh = (x: number) => {
            const hh = Math.floor(x / 3600);
            const mm = Math.floor((x % 3600) / 60);
            const ss = Math.floor(x % 60);
            const ms = Math.round((x - Math.floor(x)) * 1000);
            const p = (n: number, l: number) => String(n).padStart(l, "0");
            return `${p(hh, 2)}:${p(mm, 2)}:${p(ss, 2)},${p(ms, 3)}`;
          };
          return `${i + 1}\n${hh(s.start)} --> ${hh(s.end)}\n${s.narration}\n`;
        })
        .join("\n");
      subsPath = path.join(workDir, "subs.srt");
      await fs.promises.writeFile(subsPath, srt);
    }

    const finalPath = path.join(workDir, "final.mp4");
    const vf = subsPath
      ? `subtitles=filename='${subsPath
          .replace(/\\/g, "/")
          .replace(/:/g, "\\:")
          .replace(/'/g, "\\'")}'`
      : undefined;
    const args = [
      "-y",
      "-i", videoPath,
      "-i", mixPath,
    ];
    if (vf) args.push("-vf", vf);
    args.push(
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "20",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      "-pix_fmt", "yuv420p",
      finalPath
    );
    await runFfmpeg(args, { timeoutMs: 20 * 60 * 1000 });

    report(88, "Saving outputâ€¦");

    // 5) Persist render asset + thumbnail
    const finalBuffer = await fs.promises.readFile(finalPath);
    const asset = await saveAsset(project.userId, projectId, "RENDER", finalBuffer, "video/mp4", "storymotion-final.mp4", {
      provider: "ffmpeg",
      metadata: { resolution, fps, aspectRatio: ratio, duration: totalVisual },
    });

    // Thumbnail from first scene image
    const firstScene = scenes[0];
    if (firstScene?.imageUrl) {
      const img = await readAssetBytes(firstScene.imageUrl);
      if (img) {
        try {
          const sharp = (await import("sharp")).default;
          const thumb = await sharp(img).resize({ width: 640, height: 360, fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
          const thumbAsset = await saveAsset(project.userId, projectId, "THUMBNAIL", thumb, "image/jpeg", "project-thumbnail.jpg", {
            provider: "ffmpeg",
            metadata: { sceneId: firstScene.id },
          });
          await prisma.project.update({ where: { id: projectId }, data: { thumbnailUrl: thumbAsset.url } });
        } catch {
          /* thumbnail optional */
        }
      }
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "COMPLETED", progress: 100, error: null },
    });

    report(100, "Completed");
    return asset.url;
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}
