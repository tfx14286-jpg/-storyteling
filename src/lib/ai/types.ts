export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMProvider {
  name: string;
  kind: string;
  complete(messages: ChatMessage[], opts?: { temperature?: number; maxTokens?: number }): Promise<string>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
}

export interface ImageGenParams {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  styleRefUrl?: string;
  characterRefUrl?: string;
  seed?: number;
}

export interface ImageGenResult {
  data: Buffer;
  contentType: string;
  seed: number;
}

export interface ImageProvider {
  name: string;
  kind: string;
  generate(p: ImageGenParams): Promise<ImageGenResult>;
  upscale?(data: Buffer, contentType: string): Promise<ImageGenResult>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
}

export interface VideoGenParams {
  imageUrl: string;
  motionInstruction: string;
  durationSec: number;
  intensity: string;
  seed?: number;
}

export interface VideoGenResult {
  data: Buffer;
  contentType: string;
}

export interface VideoProvider {
  name: string;
  kind: string;
  animate(p: VideoGenParams): Promise<VideoGenResult>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
}

export interface TTSParams {
  text: string;
  voice: string; // "Male" | "Female"
  language: string;
  speed?: number; // 0.5 .. 2
  pitch?: number; // -10 .. 10
}

export interface TTSResult {
  data: Buffer;
  contentType: string;
  duration: number;
}

export interface TTSProvider {
  name: string;
  kind: string;
  synthesize(p: TTSParams): Promise<TTSResult>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
}

export interface MusicResult {
  data: Buffer;
  contentType: string;
  duration: number;
}

export interface MusicProvider {
  name: string;
  kind: string;
  generateMusic(category: string, durationSec: number): Promise<MusicResult>;
  generateSfx(label: string, durationSec: number): Promise<MusicResult>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
}

export type ProviderKind = "llm" | "image" | "video" | "tts" | "music";
