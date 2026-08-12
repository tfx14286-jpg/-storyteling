import { encodeWav, silence, tone, ambientMusic, sfx } from "@/lib/audio/wav";
import type { MusicProvider, MusicResult, TTSProvider, TTSResult, VideoProvider } from "../types";

export class MockTTS implements TTSProvider {
  name = "Mock TTS";
  kind = "mock";

  async synthesize(p: { text: string; voice: string; language: string; speed?: number }): Promise<TTSResult> {
    const duration = Math.max(
      1.5,
      p.text.trim().split(/\s+/).length / (2.4 * (p.speed ?? 1))
    );
    const samples = tone(p.voice === "Female" ? 440 : 294, duration, 0.06);
    return { data: encodeWav(samples), contentType: "audio/wav", duration };
  }

  async testConnection() {
    return { ok: true, message: "Mock TTS available (offline placeholder audio)" };
  }
}

export class MockMusic implements MusicProvider {
  name = "Mock Music/SFX";
  kind = "mock";

  async generateMusic(category: string, durationSec: number): Promise<MusicResult> {
    const samples = ambientMusic(category, durationSec);
    return { data: encodeWav(samples), contentType: "audio/wav", duration: durationSec };
  }

  async generateSfx(label: string, durationSec: number): Promise<MusicResult> {
    const samples = sfx(label, durationSec);
    return { data: encodeWav(samples), contentType: "audio/wav", duration: durationSec };
  }

  async testConnection() {
    return { ok: true, message: "Mock music provider available (procedural offline audio)" };
  }
}

export class MockVideo implements VideoProvider {
  name = "Mock Image-to-Video";
  kind = "mock";

  async animate(): Promise<{ data: Buffer; contentType: string }> {
    // Image-to-video is handled by the camera/render engine locally in mock mode.
    throw new Error("NO_LOCAL_VIDEO_PROVIDER");
  }

  async testConnection() {
    return { ok: true, message: "Mock video provider: animation handled by local render camera engine" };
  }
}

export { silence };
