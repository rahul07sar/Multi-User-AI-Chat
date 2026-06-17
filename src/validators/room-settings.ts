/**
 * Room settings validators.
 *
 * Validates room settings update requests.
 */

import { z } from "zod";

export const updateRoomSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(100),

  description: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional(),

  isInvitesEnabled: z.boolean(),

  maxParticipants: z
    .number()
    .int()
    .min(2)
    .max(500),
});