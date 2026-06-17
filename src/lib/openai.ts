/**
 * OpenAI client.
 *
 * Exposes the shared OpenAI SDK client configured from environment variables.
 */

import OpenAI from "openai";
import { env } from "@/lib/env";

export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

console.log(
  "OpenAI Key Prefix:",
  process.env.OPENAI_API_KEY?.slice(0, 12)
);