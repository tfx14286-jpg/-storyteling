export const LANGUAGES = [
  { value: "id", label: "Indonesia" },
  { value: "en", label: "English" },
  { value: "ms", label: "Malay" },
  { value: "es", label: "Español" },
  { value: "ar", label: "العربية" },
  { value: "zh", label: "中文" },
  { value: "hi", label: "हिन्दी" },
] as const;

export const DURATIONS = [
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 180, label: "3 minutes" },
  { value: 300, label: "5 minutes" },
  { value: 600, label: "10 minutes" },
] as const;

export const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9 — YouTube / Landscape" },
  { value: "9:16", label: "9:16 — TikTok / Shorts / Reels" },
  { value: "1:1", label: "1:1 — Instagram Feed" },
] as const;

export const STYLES = [
  { value: "2D Documentary", label: "2D Documentary" },
  { value: "2D Cartoon", label: "2D Cartoon" },
  { value: "Hand Drawn", label: "Hand Drawn" },
  { value: "Anime", label: "Anime" },
  { value: "Cinematic", label: "Cinematic" },
  { value: "Watercolor", label: "Watercolor" },
  { value: "Realistic", label: "Realistic" },
] as const;

export const VOICES = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
] as const;

export const TONES = [
  { value: "Educational", label: "Educational" },
  { value: "Serious", label: "Serious" },
  { value: "Emotional", label: "Emotional" },
  { value: "Funny", label: "Funny" },
  { value: "Cinematic", label: "Cinematic" },
] as const;

export const CAMERA_MOVEMENTS = [
  "Zoom In",
  "Zoom Out",
  "Pan Left",
  "Pan Right",
  "Tilt Up",
  "Tilt Down",
  "Dolly In",
  "Dolly Out",
  "Orbit",
  "Tracking",
  "Shake",
  "Static",
  "Parallax",
] as const;

export const SHOT_TYPES = [
  "Extreme Wide Shot",
  "Wide Shot",
  "Medium Wide Shot",
  "Medium Shot",
  "Close-Up",
  "Extreme Close-Up",
  "Over-the-Shoulder",
  "Aerial Shot",
] as const;

export const ANIMATION_LEVELS = [
  { value: "Static", label: "Static" },
  { value: "Subtle", label: "Subtle" },
  { value: "Medium", label: "Medium" },
  { value: "Dynamic", label: "Dynamic" },
  { value: "Cinematic", label: "Cinematic" },
] as const;

export const TRANSITIONS = [
  "Cut",
  "Fade",
  "Crossfade",
  "Zoom",
  "Slide",
  "Blur",
  "Cinematic",
] as const;

export const MUSIC_CATEGORIES = [
  "Documentary",
  "Emotional",
  "Epic",
  "Suspense",
  "Funny",
  "Historical",
  "Cinematic",
] as const;

export const PROJECT_STATUSES = [
  "DRAFT",
  "SCRIPT",
  "STORYBOARD",
  "IMAGES",
  "ANIMATED",
  "VOICE",
  "MUSIC",
  "READY",
  "RENDERING",
  "COMPLETED",
  "FAILED",
] as const;

export const SCENE_STATUSES = [
  "PENDING",
  "GENERATED",
  "FAILED",
  "ANIMATED",
  "READY",
] as const;

export const RESOLUTIONS = [
  { value: "720p", label: "720p (HD)", width: 1280, height: 720 },
  { value: "1080p", label: "1080p (Full HD)", width: 1920, height: 1080 },
  { value: "1440p", label: "1440p (2K)", width: 2560, height: 1440 },
  { value: "4k", label: "4K", width: 3840, height: 2160 },
] as const;

export const FPS_OPTIONS = [24, 30, 60] as const;

export const SOCIAL_PRESETS = [
  { name: "YouTube", ratio: "16:9", label: "YouTube", desc: "16:9 landscape" },
  { name: "TikTok", ratio: "9:16", label: "TikTok", desc: "9:16 vertical" },
  { name: "YouTube Shorts", ratio: "9:16", label: "Shorts", desc: "9:16 vertical" },
  { name: "Instagram Reels", ratio: "9:16", label: "Reels", desc: "9:16 vertical" },
  { name: "Instagram Feed", ratio: "1:1", label: "IG Feed", desc: "1:1 square" },
] as const;

// Credit costs — editable from Admin > Settings.
export const CREDIT_COSTS = {
  script_generation: 5,
  storyboard_generation: 5,
  image_generation: 10,
  image_variation: 3,
  image_upscale: 2,
  video_generation: 50,
  tts_generation: 5,
  subtitle_generation: 1,
  music_generation: 2,
  quality_check: 3,
  thumbnail_generation: 5,
  render: 20,
  credit_pack: { $5: 500, $10: 1100, $25: 3000, $50: 6500, $100: 14000 },
} as const;

export const CREDIT_PACKS = [
  { price: 5, credits: 500, popular: false },
  { price: 10, credits: 1100, popular: true },
  { price: 25, credits: 3000, popular: false },
  { price: 50, credits: 6500, popular: false },
  { price: 100, credits: 14000, popular: false },
] as const;

export const QUALITY_THRESHOLD = 75;
