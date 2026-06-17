/**
 * Chat session logout API route.
 *
 * Clears the signed room session cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { AuditLogLevel } from "@prisma/client";
import { withApiRouteLogging } from "@/server/http/observability";
import { writeAuditLog } from "@/server/security/audit-log";
import { clearChatSessionCookie } from "@/server/security/session";

export async function POST(request: NextRequest) {
  return withApiRouteLogging(request, { route: "session.logout" }, async () => {
    const response = NextResponse.json({
      ok: true,
    });

    clearChatSessionCookie(response);

    await writeAuditLog({
      eventType: "session.logout",
      level: AuditLogLevel.INFO,
      outcome: "success",
      request,
      statusCode: 200,
      details: {
        initiated: true,
      },
    });

    return response;
  });
}
