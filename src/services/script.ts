import "server-only";
import { prisma } from "@/lib/db";
import { getLLMProvider } from "@/lib/ai/registry";
import { MockLLM } from "@/lib/ai/mock/llm";
import { OpenAILLM } from "@/lib/ai/openai";
import type { CharacterData, EnvironmentData, SceneData, ScriptResult, StyleBible } from "@/types";

const LIVE_SCHEMA = `Return JSON with this exact structure:
{
  "script": { "title": string, "hook": string, "introduction": string, "mainStory": string, "climax": string, "conclusion": string, "cta": string, "narrationLanguage": string },
  "storyboard": {
    "styleBible": { "visualStyle": string, "line": string, "color": string, "lighting": string, "characters": string, "background": string, "camera": string, "texture": string, "rendering": string },
    "characters": [ { "charId": "CHAR_001", "name": string, "age": number, "gender": string, "appearance": string, "clothing": string, "colors": string, "body": string, "personality": string, "expressions": string[], "accessories": string, "prompt": string } ],
    "environments": [ { "envId": "ENV_001", "name": string, "architecture": string, "environment": string, "lighting": string, "colorPalette": string, "description": string, "prompt": string } ],
    "scenes": [ { "sceneNumber": number, "duration": number, "narration": string, "visualDescription": string, "characters": string[], "background": string, "cameraMovement": string, "shotType": string, "animation": string, "soundEffect": string|null, "transition": string, "composition": string, "lighting": string, "emotion": string, "imagePrompt": string|null, "negativePrompt": string|null, "seed": number|null } ]
  }
}
Scene narration must be written for spoken voice-over. Scenes should be 4 to 14 depending on total duration (~7 seconds each).`;

export async function generateScriptForProject(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });

  let script: ScriptResult;
  let storyboard: {
    styleBible: StyleBible;
    characters: CharacterData[];
    environments: EnvironmentData[];
    scenes: SceneData[];
  };

  const provider = getLLMProvider();
  if (provider.kind === "openai") {
    const llm = provider as OpenAILLM;
    const prompt = `You are a senior documentary writer and storyboard artist.
Create a complete educational storytelling video script for the topic below.
Topic title: ${project.title}
Description: ${project.description || "(none)"}
Language: ${project.language}
Style: ${project.style}
Tone: ${project.tone}
Total duration: ${project.durationSec} seconds
Aspect ratio: ${project.aspectRatio}

The video must feel human-written: a strong hook, a curiosity gap, emotional pacing, short natural narration sentences. Use specific, vivid visual descriptions. Choose camera movements, shot types, transitions and sound effects that fit each scene. Keep recurring characters visually consistent.

${LIVE_SCHEMA}`;
    try {
      const data = await llm.completeJson<{
        script: ScriptResult;
        storyboard: {
          styleBible: StyleBible;
          characters: CharacterData[];
          environments: EnvironmentData[];
          scenes: SceneData[];
        };
      }>([{ role: "user", content: prompt }], { temperature: 0.8 });
      script = data.script;
      storyboard = data.storyboard;
    } catch {
      // Provider fallback: use mock.
      const mock = new MockLLM();
      const out = await mock.generateStory({
        title: project.title,
        description: project.description,
        language: project.language,
        durationSec: project.durationSec,
        style: project.style,
        tone: project.tone,
      });
      script = out.script;
      storyboard = out.storyboard;
    }
  } else {
    const mock = provider as MockLLM;
    const out = await mock.generateStory({
      title: project.title,
      description: project.description,
      language: project.language,
      durationSec: project.durationSec,
      style: project.style,
      tone: project.tone,
    });
    script = out.script;
    storyboard = out.storyboard;
  }

  // Persist everything.
  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: projectId },
      data: {
        script: script as unknown as object,
        styleBible: storyboard.styleBible as unknown as object,
        status: "STORYBOARD",
        progress: 10,
      },
    });

    await tx.character.deleteMany({ where: { projectId } });
    await tx.environment.deleteMany({ where: { projectId } });
    await tx.scene.deleteMany({ where: { projectId } });

    for (const c of storyboard.characters) {
      await tx.character.create({
        data: {
          projectId,
          charId: c.charId,
          name: c.name,
          age: c.age,
          gender: c.gender,
          appearance: c.appearance,
          clothing: c.clothing,
          colors: c.colors,
          body: c.body,
          personality: c.personality,
          expressions: c.expressions as string[],
          accessories: c.accessories,
          prompt: c.prompt,
        },
      });
    }

    for (const e of storyboard.environments) {
      await tx.environment.create({
        data: {
          projectId,
          envId: e.envId,
          name: e.name,
          architecture: e.architecture,
          environment: e.environment,
          lighting: e.lighting,
          colorPalette: e.colorPalette,
          description: e.description,
          prompt: e.prompt,
        },
      });
    }

    for (const s of storyboard.scenes) {
      await tx.scene.create({
        data: {
          projectId,
          sceneNumber: s.sceneNumber,
          order: s.sceneNumber,
          duration: s.duration,
          narration: s.narration,
          visualDescription: s.visualDescription,
          characters: s.characters as string[],
          background: s.background,
          cameraMovement: s.cameraMovement,
          shotType: s.shotType,
          animation: s.animation,
          soundEffect: s.soundEffect,
          transition: s.transition,
          imagePrompt: s.imagePrompt,
          negativePrompt: s.negativePrompt,
          composition: s.composition,
          lighting: s.lighting,
          emotion: s.emotion,
          seed: s.seed,
        },
      });
    }
  });

  return storyboard;
}
