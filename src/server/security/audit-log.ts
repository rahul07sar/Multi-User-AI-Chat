/**
 * Audit log security helpers.
 *
 * Persists structured security and access events for production operations.
 */

import {
  AuditLogLevel,
  Prisma,
  type AuditLog,
} from "@prisma/client";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { getRequestId } from "@/server/http/request-id";
import type { ChatSession } from "@/server/security/session";
import { getRequestClientIp } from "@/server/security/rate-limit";

type AuditEventInput = {
  eventType: string;
  level: AuditLogLevel;
  outcome: string;
  request?: NextRequest;
  session?: ChatSession | null;
  roomId?: string | null;
  userId?: string | null;
  statusCode?: number;
  details?: Prisma.InputJsonValue;
};

type AuditLogQuery = {
  cursor?: string;
  eventType?: string;
  level?: AuditLogLevel;
  limit: number;
  outcome?: string;
  requestId?: string;
  roomId?: string;
  userId?: string;
};

type AuditLogPage = {
  items: AuditLog[];
  nextCursor: string | null;
};

function getRequestUserAgent(request?: NextRequest) {
  return request?.headers.get("user-agent") ?? null;
}

function buildAuditPayload(input: AuditEventInput) {
  return {
    eventType: input.eventType,
    level: input.level,
    outcome: input.outcome,
    requestId: input.request ? getRequestId(input.request) : null,
    roomId: input.roomId ?? input.session?.roomId ?? null,
    userId: input.userId ?? input.session?.userId ?? null,
    ipAddress: input.request ? getRequestClientIp(input.request) : null,
    userAgent: getRequestUserAgent(input.request),
    statusCode: input.statusCode ?? null,
    details: input.details ?? Prisma.JsonNull,
  };
}

export async function writeAuditLog(input: AuditEventInput) {
  const payload = buildAuditPayload(input);

  try {
    await db.auditLog.create({
      data: payload,
    });
  } catch (error) {
    const fallbackEvent = {
      ...payload,
      auditWriteFailed: true,
      error: error instanceof Error ? error.message : "Unknown audit log error",
    };

    console.error(JSON.stringify(fallbackEvent));
  }
}

export function isAuditApiAuthorized(request: NextRequest) {
  const authorizationHeader = request.headers.get("authorization");
  const headerApiKey = request.headers.get("x-admin-api-key");
  const bearerToken = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length).trim()
    : null;
  const providedApiKey = bearerToken || headerApiKey?.trim() || "";

  return providedApiKey === env.ADMIN_AUDIT_API_KEY;
}

export function mapAuditLogToDto(auditLog: AuditLog) {
  return {
    id: auditLog.id,
    eventType: auditLog.eventType,
    level: auditLog.level,
    outcome: auditLog.outcome,
    requestId: auditLog.requestId,
    roomId: auditLog.roomId,
    userId: auditLog.userId,
    ipAddress: auditLog.ipAddress,
    userAgent: auditLog.userAgent,
    statusCode: auditLog.statusCode,
    details: auditLog.details,
    createdAt: auditLog.createdAt.toISOString(),
  };
}

export async function getAuditLogs(query: AuditLogQuery): Promise<AuditLogPage> {
  const where: Prisma.AuditLogWhereInput = {
    eventType: query.eventType,
    level: query.level,
    outcome: query.outcome,
    requestId: query.requestId,
    roomId: query.roomId,
    userId: query.userId,
  };

  const auditLogs = await db.auditLog.findMany({
    where,
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    cursor: query.cursor
      ? {
          id: query.cursor,
        }
      : undefined,
    skip: query.cursor ? 1 : 0,
    take: query.limit + 1,
  });

  const hasMore = auditLogs.length > query.limit;
  const items = hasMore ? auditLogs.slice(0, query.limit) : auditLogs;
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

  return {
    items,
    nextCursor,
  };
}
