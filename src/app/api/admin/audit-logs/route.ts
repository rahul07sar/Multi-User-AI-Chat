/**
 * Audit log reporting API route.
 *
 * Returns paginated security audit events for authorized admin requests.
 */

import { AuditLogLevel } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  getAuditLogs,
  isAuditApiAuthorized,
  mapAuditLogToDto,
  writeAuditLog,
} from "@/server/security/audit-log";
import { withApiRouteLogging } from "@/server/http/observability";
import { getAuditLogsSchema } from "@/validators/chat";

export async function GET(request: NextRequest) {
  return withApiRouteLogging(request, { route: "admin.audit-logs" }, async () => {
    if (!isAuditApiAuthorized(request)) {
      await writeAuditLog({
        eventType: "admin.audit.read.denied",
        level: AuditLogLevel.WARN,
        outcome: "unauthorized",
        request,
        statusCode: 401,
      });

      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    try {
      const { searchParams } = new URL(request.url);
      const query = getAuditLogsSchema.parse({
        cursor: searchParams.get("cursor") ?? undefined,
        eventType: searchParams.get("eventType") ?? undefined,
        level: searchParams.get("level") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
        outcome: searchParams.get("outcome") ?? undefined,
        requestId: searchParams.get("requestId") ?? undefined,
        roomId: searchParams.get("roomId") ?? undefined,
        userId: searchParams.get("userId") ?? undefined,
      });

      const auditLogs = await getAuditLogs(query);

      await writeAuditLog({
        eventType: "admin.audit.read.succeeded",
        level: AuditLogLevel.INFO,
        outcome: "success",
        request,
        statusCode: 200,
        details: {
          cursor: query.cursor ?? null,
          eventType: query.eventType ?? null,
          level: query.level ?? null,
          limit: query.limit,
          outcome: query.outcome ?? null,
          requestId: query.requestId ?? null,
          resultsReturned: auditLogs.items.length,
          roomId: query.roomId ?? null,
          userId: query.userId ?? null,
        },
      });

      return NextResponse.json({
        items: auditLogs.items.map(mapAuditLogToDto),
        nextCursor: auditLogs.nextCursor,
      });
    } catch (error) {
      await writeAuditLog({
        eventType: "admin.audit.read.failed",
        level: AuditLogLevel.ERROR,
        outcome: "error",
        request,
        statusCode: 400,
        details: {
          error:
            error instanceof Error ? error.message : "Unknown audit query error",
        },
      });

      return NextResponse.json(
        { error: "Unable to load audit logs" },
        { status: 400 }
      );
    }
  });
}
