import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  PORT: z.coerce.number().int().positive().default(3001),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  OPENAI_API_KEY: z.string().min(1),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

  MISTRAL_API_KEY: z.string().min(1),
  MISTRAL_MODEL: z.string().default("mistral-large-latest"),

  RAG_TOP_K: z.coerce.number().int().positive().default(5),
  RAG_MAX_CONTEXT_CHARS: z.coerce.number().int().positive().default(12_000),
  RAG_HISTORY_TURNS: z.coerce.number().int().min(0).max(20).default(3),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
});

export const env = EnvSchema.parse(process.env);
