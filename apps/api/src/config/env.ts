import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from local directory and repository root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().default('5432').transform((val) => parseInt(val, 10)),
  DB_NAME: z.string().default('bookleaf'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_SSL: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  // ─── AI Provider Configuration ───────────────────────────────────────────────
  // Primary provider to use for AI tasks (e.g. 'openai' or 'gemini').
  AI_PRIMARY_PROVIDER: z.string().default('openai'),
  // Comma-separated fallback providers tried in order if the primary fails.
  // e.g. 'gemini' or 'gemini,openai'
  AI_FALLBACK_PROVIDERS: z
    .string()
    .default('gemini')
    .transform((val) =>
      val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),

  // Gemini
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
  GEMINI_TIMEOUT_MS: z
    .string()
    .default('45000')
    .transform((val) => {
      const parsed = parseInt(val, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 45000;
    }),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').default('bookleaf-dev-jwt-secret-change-in-production-!!'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  // Admin seeding
  ADMIN_EMAIL: z.string().email().default('admin@bookleaf.pub'),
  ADMIN_PASSWORD: z.string().default('admin123'),
  ADMIN_NAME: z.string().default('BookLeaf Admin'),
});

export const env = envSchema.parse(process.env);
