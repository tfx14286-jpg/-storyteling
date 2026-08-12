import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import ffmpegPath from "ffmpeg-static";

let cachedPath: string | null = null;

export function getFfmpegPath(): string {
  if (cachedPath) return cachedPath;
  const candidates = [
    process.env.FFMPEG_PATH,
    ffmpegPath,
    resolve(process.cwd(), "node_modules/ffmpeg-static/ffmpeg.exe"),
  ].filter((c): c is string => Boolean(c));
  cachedPath = candidates.find((c) => existsSync(c)) ?? null;
  if (!cachedPath) throw new Error("ffmpeg binary not found");
  return cachedPath;
}

export interface RunFfmpegResult {
  stdout: string;
  stderr: string;
}

export async function runFfmpeg(args: string[], opts: { timeoutMs?: number } = {}): Promise<RunFfmpegResult> {
  const bin = getFfmpegPath();
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error("FFmpeg timed out"));
    }, opts.timeoutMs ?? 10 * 60 * 1000);
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (e) => {
      clearTimeout(timeout);
      reject(e);
    });
    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve({ stdout, stderr });
      else {
        const tail = stderr.split("\n").slice(-12).join("\n");
        reject(new Error(`FFmpeg exited ${code}\n${tail}`));
      }
    });
  });
}
