/**
 * Environment configuration.
 *
 * Validates and exports the runtime environment variables used by the app.
 */

import { z } from "zod";

const envSchema = z.object({
  ADMIN_AUDIT_API_KEY: z.string().min(16),
  DATABASE_URL: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
  PASSCODE_PEPPER: z.string().min(16),
  CHAT_SESSION_SECRET: z.string().min(16),
  JOIN_ROOM_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(10),
  SEND_MESSAGE_RATE_LIMIT_PER_MINUTE: z.coerce
    .number()
    .int()
    .positive()
    .default(20),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export const env = envSchema.parse({
  ADMIN_AUDIT_API_KEY: process.env.ADMIN_AUDIT_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  PASSCODE_PEPPER: process.env.PASSCODE_PEPPER,
  CHAT_SESSION_SECRET: process.env.CHAT_SESSION_SECRET,
  JOIN_ROOM_RATE_LIMIT_PER_MINUTE:
    process.env.JOIN_ROOM_RATE_LIMIT_PER_MINUTE,
  SEND_MESSAGE_RATE_LIMIT_PER_MINUTE:
    process.env.SEND_MESSAGE_RATE_LIMIT_PER_MINUTE,
  NODE_ENV: process.env.NODE_ENV,
});
