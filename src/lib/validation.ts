import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/, "Username hanya boleh berisi huruf, angka, dan underscore."),
  displayName: z.string().trim().min(2).max(80),
  password: z.string().min(12).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export const chatSchema = z.object({
  message: z.string().trim().min(1).max(12_000),
  provider: z.enum(["auto", "openai", "google", "anthropic", "xai", "deepseek", "github"]).default("auto"),
  fallback: z.boolean().default(true),
  conversationId: z.string().cuid().optional(),
});
