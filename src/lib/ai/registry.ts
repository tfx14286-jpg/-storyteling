import "server-only";
import { appConfig, isMockMode } from "@/lib/env";
import type {
  ImageProvider,
  LLMProvider,
  MusicProvider,
  ProviderKind,
  TTSProvider,
  VideoProvider,
} from "./types";
import { MockLLM } from "./mock/llm";
import { MockImageProvider } from "./mock/image";
import { MockTTS, MockMusic, MockVideo } from "./mock/tts";
import { OpenAILLM } from "./openai";
import { WindowsTTS } from "./windows-tts";

export function getLLMProvider(): LLMProvider {
  if (!isMockMode() && appConfig.llmProvider !== "mock" && appConfig.openaiApiKey) {
    return new OpenAILLM();
  }
  return new MockLLM();
}

export function getImageProvider(): ImageProvider {
  if (!isMockMode() && appConfig.imageProvider !== "mock" && appConfig.openaiImageKey) {
    return new OpenAILLMImage();
  }
  return new MockImageProvider();
}

export function getVideoProvider(): VideoProvider {
  return new MockVideo();
}

export function getTTSProvider(): TTSProvider {
  if (appConfig.ttsProvider === "windows") return new WindowsTTS();
  return new MockTTS();
}

export function getMusicProvider(): MusicProvider {
  return new MockMusic();
}

// OpenAI image generation via the DALL-E / images API (OpenAI-compatible).
class OpenAILLMImage implements ImageProvider {
  name = "OpenAI Images";
  kind = "openai";

  async generate(p: {
    prompt: string;
    negativePrompt?: string;
    aspectRatio: string;
    styleRefUrl?: string;
    characterRefUrl?: string;
    seed?: number;
  }): Promise<{ data: Buffer; contentType: string; seed: number }> {
    const base = appConfig.imageBaseUrl || appConfig.openaiBaseUrl || "https://api.openai.com/v1";
    const model = appConfig.imageModel || "gpt-image-1";
    const key = appConfig.openaiImageKey || appConfig.openaiApiKey;
    if (!key) throw new Error("IMAGE_API_KEY not configured");
    const res = await fetch(`${base}/images/generations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        prompt: p.prompt,
        size: p.aspectRatio === "9:16" ? "1024x1792" : p.aspectRatio === "1:1" ? "1024x1024" : "1792x1024",
        n: 1,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Image API failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const data = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
    const item = data.data?.[0];
    if (!item) throw new Error("Image API returned no data");
    if (item.b64_json) {
      return { data: Buffer.from(item.b64_json, "base64"), contentType: "image/png", seed: p.seed ?? 0 };
    }
    if (item.url) {
      const img = await fetch(item.url);
      const buf = Buffer.from(await img.arrayBuffer());
      return { data: buf, contentType: img.headers.get("content-type") || "image/png", seed: p.seed ?? 0 };
    }
    throw new Error("Image API returned no usable image");
  }

  async testConnection() {
    const key = appConfig.openaiImageKey || appConfig.openaiApiKey;
    if (!key) return { ok: false, message: "IMAGE_API_KEY not configured" };
    return { ok: true, message: "OpenAI image provider configured" };
  }
}

export async function providerStatus() {
  const providers: { kind: ProviderKind; provider: string; ok: boolean; message: string; mock: boolean }[] = [];
  const llm = getLLMProvider();
  providers.push({ kind: "llm", provider: llm.kind, ...(await llm.testConnection()), mock: llm.kind === "mock" });
  const img = getImageProvider();
  providers.push({ kind: "image", provider: img.kind, ...(await img.testConnection()), mock: img.kind === "mock" });
  const vid = getVideoProvider();
  providers.push({ kind: "video", provider: vid.kind, ...(await vid.testConnection()), mock: vid.kind === "mock" });
  const tts = getTTSProvider();
  providers.push({ kind: "tts", provider: tts.kind, ...(await tts.testConnection()), mock: tts.kind === "mock" });
  const mus = getMusicProvider();
  providers.push({ kind: "music", provider: mus.kind, ...(await mus.testConnection()), mock: mus.kind === "mock" });
  return { aiMode: isMockMode() ? "mock" : "live", providers };
}
