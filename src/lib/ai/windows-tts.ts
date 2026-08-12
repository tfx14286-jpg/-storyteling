import { spawn } from "node:child_process";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { randomToken } from "@/lib/crypto";
import { parseWavInfo } from "@/lib/audio/wav";
import type { TTSParams, TTSResult, TTSProvider } from "./types";

function estimateDuration(text: string, speed: number): number {
  const words = text.trim().split(/\s+/).length;
  const wps = 2.6 * speed;
  return Math.max(1.5, words / wps);
}

export class WindowsTTS implements TTSProvider {
  name = "Windows Speech (System.Speech)";
  kind = "windows";

  private async runPs(script: string): Promise<string> {
    const encoded = Buffer.from(script, "utf16le").toString("base64");
    return new Promise((resolve, reject) => {
      const proc = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded], {
        windowsHide: true,
      });
      let out = "";
      let err = "";
      proc.stdout.on("data", (d) => (out += d.toString()));
      proc.stderr.on("data", (d) => (err += d.toString()));
      proc.on("error", (e) => reject(e));
      proc.on("close", (code) => {
        if (code !== 0 && !out) reject(new Error(`PowerShell exited ${code}: ${err}`));
        else resolve(out.trim());
      });
    });
  }

  async synthesize(p: TTSParams): Promise<TTSResult> {
    const tmp = path.join(os.tmpdir(), `smtts-${randomToken(8)}.wav`);
    const textB64 = Buffer.from(p.text, "utf8").toString("base64");
    const rate = Math.max(-10, Math.min(10, Math.round((p.speed ?? 1) * 2 - 2)));
    const gender = p.voice === "Female" ? "Female" : "Male";
    const script = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SetOutputToWaveFile('${tmp.replace(/'/g, "''")}')
$s.Rate = ${rate}
try {
  $voice = $s.GetInstalledVoices() | Where-Object { $_.Enabled }
  if ($voice) { $s.SelectVoice($voice[$voice.Count - 1].VoiceInfo.Name) }
} catch {}
$text = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${textB64}'))
$s.Speak($text)
$s.Dispose()
if (Test-Path '${tmp.replace(/'/g, "''")}') { Write-Output 'OK' }
`;
    try {
      await this.runPs(script);
      const data = fs.readFileSync(tmp);
      fs.rmSync(tmp, { force: true });
      const { duration } = parseWavInfo(data);
      if (duration < 0.3) throw new Error("TTS produced empty audio");
      return { data, contentType: "audio/wav", duration };
    } catch (e) {
      // Fallback: soft placeholder tone with estimated duration.
      const { tone, encodeWav } = await import("@/lib/audio/wav");
      const duration = estimateDuration(p.text, p.speed ?? 1);
      const samples = tone(p.voice === "Female" ? 330 : 220, duration, 0.12);
      return { data: encodeWav(samples), contentType: "audio/wav", duration };
    }
  }

  async testConnection() {
    try {
      await this.runPs("$x = 1; Write-Output 'OK'");
      return { ok: true, message: "Windows speech engine available" };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Windows speech unavailable" };
    }
  }
}
