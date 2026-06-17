/**
 * Rate limit security helpers.
 *
 * Provides database-backed fixed-window throttling for sensitive routes.
 */

import { db } from "@/lib/db";
import type { NextRequest } from "next/server";

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

type RateLimitOptions = {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

const RATE_LIMIT_RETENTION_MS = 24 * 60 * 60 * 1000;
const globalForRateLimit = globalThis as typeof globalThis & {
  chatRateLimitCleanupAt?: number;
};

function getWindowStart(now: number, windowMs: number) {
  return new Date(Math.floor(now / windowMs) * windowMs);
}

function getWindowResetAt(windowStart: Date, windowMs: number) {
  return windowStart.getTime() + windowMs;
}

async function cleanupExpiredBuckets(now: number) {
  const lastCleanupAt = globalForRateLimit.chatRateLimitCleanupAt ?? 0;

  if (now - lastCleanupAt < 5 * 60 * 1000) {
    return;
  }

  globalForRateLimit.chatRateLimitCleanupAt = now;

  await db.rateLimitBucket.deleteMany({
    where: {
      updatedAt: {
        lt: new Date(now - RATE_LIMIT_RETENTION_MS),
      },
    },
  });
}

export function getRequestClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export async function applyRateLimit({
  scope,
  identifier,
  limit,
  windowMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = getWindowStart(now, windowMs);
  const resetAt = getWindowResetAt(windowStart, windowMs);

  void cleanupExpiredBuckets(now);

  const bucket = await db.rateLimitBucket.upsert({
    where: {
      scope_identifier_windowStart: {
        scope,
        identifier,
        windowStart,
      },
    },
    create: {
      scope,
      identifier,
      windowStart,
      count: 1,
    },
    update: {
      count: {
        increment: 1,
      },
    },
  });

  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

  return {
    allowed: bucket.count <= limit,
    retryAfterSeconds,
    remaining: Math.max(0, limit - bucket.count),
  };
}
