import "server-only";
import { prisma } from "@/lib/db";
import { getVoiceDuration } from "@/services/timeline";
import type { QualityReport } from "@/types";
import { QUALITY_THRESHOLD } from "@/lib/constants";

export async function runQualityCheck(projectId: string): Promise<QualityReport> {
  const scenes = await prisma.scene.findMany({ where: { projectId }, orderBy: { order: "asc" } });
  const problems: QualityReport["problems"] = [];

  let score = 100;

  for (const scene of scenes) {
    const issues: { scene: number; issue: string; fix: string }[] = [];

    if (!scene.imageUrl) {
      issues.push({ scene: scene.sceneNumber, issue: "Missing scene image", fix: "Regenerate image for this scene" });
      score -= 12;
    }
    if (!scene.voiceUrl) {
      issues.push({ scene: scene.sceneNumber, issue: "Missing voice-over", fix: "Generate voice for this scene" });
      score -= 8;
    }
    const voiceDur = await getVoiceDuration(scene);
    if (scene.duration < voiceDur - 0.5) {
      issues.push({
        scene: scene.sceneNumber,
        issue: `Narration (${voiceDur.toFixed(1)}s) longer than scene duration (${scene.duration}s)`,
        fix: "Increase scene duration to fit narration",
      });
      score -= 6;
    }
    if (!scene.visualDescription) {
      issues.push({ scene: scene.sceneNumber, issue: "Empty visual description", fix: "Re-generate script" });
      score -= 4;
    }
    if (!scene.narration.trim()) {
      issues.push({ scene: scene.sceneNumber, issue: "Empty narration", fix: "Re-generate script" });
      score -= 6;
    }
    if (scene.status === "FAILED") {
      issues.push({ scene: scene.sceneNumber, issue: "Scene generation failed", fix: "Retry scene generation" });
      score -= 10;
    }

    problems.push(...issues);
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    passed: score >= QUALITY_THRESHOLD,
    problems,
  };
}
