export function envOr(name: string, fallback = ""): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

export const appConfig = {
  aiMode: envOr("AI_MODE", "mock"), // "mock" | "live"
  llmProvider: envOr("LLM_PROVIDER", "mock"),
  imageProvider: envOr("IMAGE_PROVIDER", "mock"),
  videoProvider: envOr("VIDEO_PROVIDER", "mock"),
  ttsProvider: envOr("TTS_PROVIDER", "windows"),
  musicProvider: envOr("MUSIC_PROVIDER", "mock"),
  storageProvider: envOr("STORAGE_PROVIDER", "local"),

  openaiApiKey: envOr("OPENAI_API_KEY"),
  openaiBaseUrl: envOr("OPENAI_BASE_URL", "https://api.openai.com/v1"),
  openaiLlmModel: envOr("OPENAI_LLM_MODEL", "gpt-4o-mini"),
  openaiImageKey: envOr("IMAGE_API_KEY"),
  imageBaseUrl: envOr("IMAGE_BASE_URL"),
  imageModel: envOr("IMAGE_MODEL"),
  videoApiKey: envOr("VIDEO_API_KEY"),
  videoBaseUrl: envOr("VIDEO_BASE_URL"),
  videoModel: envOr("VIDEO_MODEL"),
  openaiTtsKey: envOr("OPENAI_TTS_KEY"),
  openaiTtsModel: envOr("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"),
  elevenLabsKey: envOr("ELEVENLABS_API_KEY"),
  elevenLabsVoiceId: envOr("ELEVENLABS_VOICE_ID"),

  redisUrl: envOr("REDIS_URL"),

  storageAccessKey: envOr("STORAGE_ACCESS_KEY"),
  storageSecretKey: envOr("STORAGE_SECRET_KEY"),
  storageEndpoint: envOr("STORAGE_ENDPOINT"),
  storageBucket: envOr("STORAGE_BUCKET"),
  storageRegion: envOr("STORAGE_REGION"),
} as const;

export function isMockMode(): boolean {
  return appConfig.aiMode === "mock";
}
