import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  name: z.string().min(2, "Nama minimal 2 karakter").max(80),
});

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const createProjectSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter").max(160),
  description: z.string().max(2000).optional().default(""),
  language: z.string().min(2).max(6).default("id"),
  durationSec: z.number().int().min(10).max(1800).default(60),
  aspectRatio: z.string().regex(/^\d+:\d+$/).default("16:9"),
  style: z.string().min(1).default("2D Documentary"),
  voice: z.enum(["Male", "Female"]).default("Male"),
  tone: z.string().min(1).default("Educational"),
});

export const regenerateSceneSchema = z.object({
  part: z.enum(["image", "animation", "voice", "scene", "prompt"]).default("image"),
});

export const updateSceneSchema = z.object({
  narration: z.string().max(2000).optional(),
  visualDescription: z.string().max(2000).optional(),
  duration: z.number().min(1).max(120).optional(),
  cameraMovement: z.string().max(60).optional(),
  shotType: z.string().max(60).optional(),
  animation: z.string().max(60).optional(),
  soundEffect: z.string().max(200).optional().nullable(),
  transition: z.string().max(60).optional(),
  background: z.string().max(500).optional(),
});

export const renderSchema = z.object({
  resolution: z.string().default("1080p"),
  fps: z.number().int().min(1).max(60).default(30),
  aspectRatio: z.string().regex(/^\d+:\d+$/).default("16:9"),
  subtitleEnabled: z.boolean().default(true),
  watermarkEnabled: z.boolean().default(false),
});

export const providerConfigSchema = z.object({
  category: z.string().min(2),
  name: z.string().min(2),
  provider: z.string().min(2),
  isActive: z.boolean().default(true),
  isFallback: z.boolean().default(false),
  priority: z.number().int().default(0),
  config: z.record(z.string(), z.any()).optional(),
  apiKey: z.string().optional(),
});

export const adminUserActionSchema = z.object({
  action: z.enum(["disable", "enable", "add_credits", "refund_credits"]),
  credits: z.number().int().optional(),
  description: z.string().optional(),
});
