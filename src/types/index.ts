export interface ScriptSection {
  title: string;
  content: string;
}

export interface SceneData {
  sceneNumber: number;
  duration: number;
  narration: string;
  visualDescription: string;
  characters: string[];
  background: string;
  cameraMovement: string;
  shotType: string;
  animation: string;
  soundEffect: string | null;
  transition: string;
  composition: string;
  lighting: string;
  emotion: string;
  imagePrompt: string | null;
  negativePrompt: string | null;
  seed: number | null;
}

export interface ScriptResult {
  title: string;
  hook: string;
  introduction: string;
  mainStory: string;
  climax: string;
  conclusion: string;
  cta: string;
  narrationLanguage: string;
}

export interface CharacterData {
  charId: string;
  name: string;
  age: number | null;
  gender: string | null;
  appearance: string;
  clothing: string;
  colors: string;
  body: string;
  personality: string;
  expressions: string[];
  accessories: string;
  prompt: string;
}

export interface EnvironmentData {
  envId: string;
  name: string;
  architecture: string;
  environment: string;
  lighting: string;
  colorPalette: string;
  description: string;
  prompt: string;
}

export interface StyleBible {
  visualStyle: string;
  line: string;
  color: string;
  lighting: string;
  characters: string;
  background: string;
  camera: string;
  texture: string;
  rendering: string;
}

export interface StoryboardResult {
  styleBible: StyleBible;
  characters: CharacterData[];
  environments: EnvironmentData[];
  scenes: SceneData[];
}

export interface ImageResult {
  url: string;
  provider: string;
  seed: number;
  thumbnails?: string[];
}

export interface VideoClipResult {
  url: string;
  provider: string;
}

export interface TtsResult {
  url: string;
  duration: number;
  provider: string;
}

export interface QualityReport {
  score: number;
  passed: boolean;
  problems: { scene: number; issue: string; fix: string }[];
}

export interface GenerationProgress {
  stage: string;
  progress: number;
  message: string;
  sceneNumber?: number;
}
