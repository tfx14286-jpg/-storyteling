import { seededRandom } from "@/lib/rate-limit";
import type {
  CharacterData,
  EnvironmentData,
  ScriptResult,
  SceneData,
  StyleBible,
} from "@/types";
import type { LLMProvider } from "../types";

interface MockLLMInput {
  title: string;
  description: string;
  language: string;
  durationSec: number;
  style: string;
  tone: string;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickN<T>(rng: () => number, arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  }
  return out;
}

function targetScenes(durationSec: number): number {
  return Math.min(14, Math.max(4, Math.round(durationSec / 7)));
}

function buildText(language: string, subject: string, desc: string, rng: () => number) {
  const isId = language === "id";
  const s = (en: string, id: string) => (isId ? id : en);
  const refs = isId
    ? [`"${subject}"`, subject, `topik ${subject}`, `kisah ${subject}`]
    : [`"${subject}"`, subject, `the story of ${subject}`, subject];
  const ref = () => pick(rng, refs);

  const hook = isId
    ? `Pernahkah kamu bertanya-tanya, ${ref()}? Ini salah satu pertanyaan yang paling menggugah rasa penasaran manusia.`
    : `Have you ever wondered, ${ref()}? It is one of the most fascinating questions humans have ever asked.`;

  const intro = s(
    `To understand ${subject}, we must travel back in time, to a moment when the world looked very different from today.`,
    `Untuk memahami ${subject}, kita harus kembali ke masa lalu, ke sebuah zaman ketika dunia terlihat sangat berbeda dari sekarang.`
  );

  const context = s(
    `In those early days, there were no rules, no leaders, no borders. Small groups of people moved together, guided only by instinct and survival.`,
    `Pada masa awal itu, tidak ada aturan, tidak ada pemimpin, tidak ada batas wilayah. Kelompok-kelompok kecil manusia bergerak bersama, hanya dipandu naluri dan bertahan hidup.`
  );

  const mainA = s(
    `Slowly, things began to change. People learned to grow food, to build shelters, and to protect one another. Communities were born out of this shared need.`,
    `Perlahan, semuanya mulai berubah. Manusia belajar bercocok tanam, membangun tempat tinggal, dan saling melindungi. Komunitas lahir dari kebutuhan bersama ini.`
  );

  const mainB = s(
    `As these communities grew larger, they needed order. Decisions had to be made, resources had to be shared, and disagreements had to be settled.`,
    `Saat komunitas semakin besar, mereka membutuhkan keteraturan. Keputusan harus diambil, sumber daya harus dibagi, dan perselisihan harus diselesaikan.`
  );

  const mainC = s(
    `Leaders emerged. Rules became laws. What once was a small tribe slowly transformed into something more complex, more organized, and more powerful.`,
    `Pemimpin pun muncul. Aturan menjadi hukum. Apa yang tadinya hanya suku kecil perlahan berubah menjadi sesuatu yang lebih kompleks, lebih terorganisir, dan lebih kuat.`
  );

  const climax = s(
    `And yet, every step forward came with a cost. Power brought responsibility. Freedom brought sacrifice. This is the story of how ${subject} shaped the destiny of humanity.`,
    `Namun di balik itu semua, setiap langkah maju memiliki harga. Kekuasaan membawa tanggung jawab. Kebebasan membawa pengorbanan. Inilah kisah bagaimana ${subject} membentuk takdir umat manusia.`
  );

  const conclusion = s(
    `Today, ${subject} is something we often take for granted. But its roots run deeper than we realize, woven into the very fabric of how we live together.`,
    `Kini, ${subject} menjadi hal yang sering kita anggap biasa. Padahal akarnya jauh lebih dalam dari yang kita sadari, terjalin dalam cara kita hidup bersama.`
  );

  const cta = s(
    `Understanding the past helps us build a better future. If you enjoyed this story, follow along for more journeys through history.`,
    `Memahami masa lalu membantu kita membangun masa depan yang lebih baik. Jika kamu menikmati kisah ini, ikuti terus untuk menjelajahi lebih banyak perjalanan sejarah.`
  );

  return { hook, intro, context, mainA, mainB, mainC, climax, conclusion, cta };
}

const CAMERAS = [
  { m: "Zoom In", s: "Slow push-in" },
  { m: "Pan Left", s: "Gentle pan left" },
  { m: "Pan Right", s: "Gentle pan right" },
  { m: "Tilt Up", s: "Slow tilt up" },
  { m: "Dolly In", s: "Dolly forward" },
  { m: "Static", s: "Steady static shot" },
  { m: "Parallax", s: "Parallax depth move" },
  { m: "Orbit", s: "Slow orbit around subject" },
];

const SHOTS = [
  "Wide Shot",
  "Medium Wide Shot",
  "Medium Shot",
  "Close-Up",
  "Extreme Close-Up",
  "Aerial Shot",
  "Over-the-Shoulder",
];

const LIGHTING = [
  "Warm afternoon sunlight",
  "Soft golden hour light",
  "Moody overcast light",
  "Dramatic rim light",
  "Cinematic soft key light",
  "Cool blue ambient light",
];

const EMOTIONS = ["Curious", "Calm", "Hopeful", "Serious", "Wonder", "Reflective"];

const SFX = ["birds chirping", "wind", "crowd murmur", "footsteps", "fire crackling", "water flowing", "drum beat", "paper rustling"];

const ENV_SETS = [
  { name: "Ancient Village", env: "Grass field, wooden huts, dirt road, distant hills", palette: "Earth tones", architecture: "Wood and bamboo houses" },
  { name: "Historical Landscape", env: "Open plains, river, mountains on the horizon", palette: "Warm ochre and green", architecture: "Natural terrain landmarks" },
  { name: "Ancient City", env: "Stone walls, market square, temple, city gates", palette: "Sandstone and terracotta", architecture: "Stone walls and arches" },
  { name: "Modern World", env: "Skyscraper skyline, busy streets, bridges", palette: "Steel blue and warm glass", architecture: "Modern glass towers" },
];

function buildStyleBible(style: string, tone: string): StyleBible {
  const styleDetail = (style: string) => {
    switch (style) {
      case "2D Cartoon":
        return {
          visualStyle: "Modern 2D cartoon illustration for educational animation",
          line: "Bold clean outline, expressive shapes",
          color: "Vivid saturated colors with friendly palettes",
          texture: "Smooth cel shading, subtle grain",
          rendering: "High-quality animated cartoon frame",
        };
      case "Hand Drawn":
        return {
          visualStyle: "Hand-drawn educational illustration",
          line: "Sketchy pencil-like linework with natural wobble",
          color: "Muted watercolor-inspired palette",
          texture: "Visible paper texture, soft edges",
          rendering: "Warm handcrafted illustrated frame",
        };
      case "Anime":
        return {
          visualStyle: "Modern anime key visual for documentary",
          line: "Clean dynamic anime linework",
          color: "Rich cinematic anime palette",
          texture: "Subtle cel shading, soft gradients",
          rendering: "High-end anime production frame",
        };
      case "Cinematic":
        return {
          visualStyle: "Cinematic 2D documentary illustration",
          line: "Refined confident linework",
          color: "Teal and orange cinematic grading",
          texture: "Subtle film grain",
          rendering: "Cinematic still frame with depth of field",
        };
      case "Watercolor":
        return {
          visualStyle: "Watercolor storybook illustration",
          line: "Soft loose watercolor washes",
          color: "Pastel translucent colors",
          texture: "Watercolor paper texture, soft bleeding",
          rendering: "Delicate painted frame",
        };
      case "Realistic":
        return {
          visualStyle: "Realistic 2D illustration for documentary",
          line: "Detailed precise rendering",
          color: "Natural true-to-life colors",
          texture: "Fine detail texture",
          rendering: "Photorealistic-style painted frame",
        };
      default:
        return {
          visualStyle: "Modern 2D educational documentary illustration",
          line: "Clean hand-drawn linework",
          color: "Warm muted colors",
          texture: "Subtle paper texture",
          rendering: "High-quality illustrated animation frame",
        };
    }
  };
  const d = styleDetail(style);
  return {
    visualStyle: d.visualStyle,
    line: d.line,
    color: d.color,
    lighting: tone === "Cinematic" ? "Soft cinematic lighting" : "Natural balanced documentary lighting",
    characters: "Simple expressive human characters",
    background: "Detailed historical environments",
    camera: "Cinematic 2D camera movement",
    texture: d.texture,
    rendering: d.rendering,
  };
}

function buildPrompt(styleBible: StyleBible, scene: SceneData, characters: CharacterData[], envs: EnvironmentData[]): string {
  const chars = characters.map((c) => `${c.name}: ${c.appearance} wearing ${c.clothing}`).join("; ");
  const env = envs.find((e) => scene.background.includes(e.envId));
  return [
    `STYLE BIBLE: ${styleBible.visualStyle}. ${styleBible.line}. ${styleBible.color}. ${styleBible.lighting}. ${styleBible.texture}. ${styleBible.rendering}.`,
    characters.length ? `CHARACTER BIBLE: ${chars}.` : "",
    env ? `ENVIRONMENT (${env.envId} ${env.name}): ${env.environment}. ${env.architecture}. Palette: ${env.colorPalette}.` : `BACKGROUND: ${scene.background}.`,
    `SCENE: ${scene.visualDescription}`,
    `COMPOSITION: ${scene.composition}. SHOT: ${scene.shotType}.`,
    `CAMERA: ${scene.cameraMovement}.`,
    `LIGHTING: ${scene.lighting}.`,
    `ACTION: ${scene.animation}.`,
    `EMOTION: ${scene.emotion}.`,
    "CONSISTENCY: Keep all recurring characters visually identical in face, hair, clothing and proportions.",
  ]
    .filter(Boolean)
    .join("\n");
}

const NEGATIVE =
  "inconsistent character, different clothing, different face, extra fingers, deformed hands, duplicate character, bad anatomy, text, watermark, logo, low quality, blurry, photorealistic, jpeg artifacts";

export class MockLLM implements LLMProvider {
  name = "Mock LLM";
  kind = "mock";

  async complete(_messages: { role: string; content: string }[]): Promise<string> {
    throw new Error("MockLLM.complete is not used directly — see generateStory");
  }

  async testConnection() {
    return { ok: true, message: "Mock LLM always available (offline)" };
  }

  async generateStory(input: MockLLMInput): Promise<{ script: ScriptResult; storyboard: { styleBible: StyleBible; characters: CharacterData[]; environments: EnvironmentData[]; scenes: SceneData[] } }> {
    const seed = Date.now() % 1000000;
    const rng = seededRandom(seed);
    const nScenes = targetScenes(input.durationSec);
    const t = buildText(input.language, input.title, input.description, rng);
    const sections: string[] = [
      t.hook,
      t.intro,
      t.context,
      t.mainA,
      t.mainB,
      t.mainC,
      t.climax,
      t.conclusion,
      t.cta,
    ];

    // Distribute sections across scenes, repeating as needed for long videos.
    const narrations: string[] = [];
    for (let i = 0; i < nScenes; i++) {
      narrations.push(sections[i % sections.length]);
    }

    const characters: CharacterData[] = [
      {
        charId: "CHAR_001",
        name: "Village Leader",
        age: 45,
        gender: "Male",
        appearance: "Medium build, tan skin, short black hair",
        clothing: "Brown traditional tunic with woven belt",
        colors: "Warm browns and earthy reds",
        body: "Average height, sturdy posture",
        personality: "Calm, authoritative and wise",
        expressions: ["serious", "hopeful", "welcoming"],
        accessories: "wooden staff",
        prompt: "",
      },
      {
        charId: "CHAR_002",
        name: "Storyteller",
        age: 60,
        gender: "Female",
        appearance: "Slender, warm skin, grey hair in a bun",
        clothing: "Long embroidered shawl over muted dress",
        colors: "Deep teal and gold accents",
        body: "Small, gentle movements",
        personality: "Warm, expressive and wise",
        expressions: ["curious", "joyful", "reflective"],
        accessories: "leather book",
        prompt: "",
      },
    ];

    const environments: EnvironmentData[] = ENV_SETS.map((e, i) => ({
      envId: `ENV_${String(i + 1).padStart(3, "0")}`,
      name: e.name,
      architecture: e.architecture,
      environment: e.env,
      lighting: pick(rng, LIGHTING),
      colorPalette: e.palette,
      description: e.env,
      prompt: "",
    }));

    const styleBible = buildStyleBible(input.style, input.tone);

    const scenes: SceneData[] = narrations.map((narration, i) => {
      const cam = pick(rng, CAMERAS);
      const env = environments[i % environments.length];
      const chars = i % 3 === 0 ? [characters[0]] : i % 2 === 0 ? [characters[1]] : characters;
      const bg = `${env.envId} ${env.name}`;
      const scene: SceneData = {
        sceneNumber: i + 1,
        duration: i === 0 ? 7 : 7,
        narration,
        visualDescription: `${env.environment} with ${chars.map((c) => c.name).join(" and ")}.`,
        characters: chars.map((c) => c.charId),
        background: bg,
        cameraMovement: cam.m,
        shotType: pick(rng, SHOTS),
        animation: pick(rng, ["Subtle", "Medium", "Subtle", "Dynamic"]),
        soundEffect: pick(rng, SFX),
        transition: i === 0 ? "Fade" : pick(rng, ["Cut", "Crossfade", "Fade", "Zoom"]),
        composition: "Rule of thirds, subject slightly off-center",
        lighting: pick(rng, LIGHTING),
        emotion: pick(rng, EMOTIONS),
        imagePrompt: null,
        negativePrompt: NEGATIVE,
        seed: null,
      };
      scene.imagePrompt = buildPrompt(styleBible, scene, characters, environments);
      scene.seed = Math.floor(rng() * 1000000);
      return scene;
    });

    const script: ScriptResult = {
      title: input.title,
      hook: t.hook,
      introduction: `${t.intro} ${t.context}`,
      mainStory: `${t.mainA} ${t.mainB} ${t.mainC}`,
      climax: t.climax,
      conclusion: t.conclusion,
      cta: t.cta,
      narrationLanguage: input.language,
    };

    return { script, storyboard: { styleBible, characters, environments, scenes } };
  }
}
