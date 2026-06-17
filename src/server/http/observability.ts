/**
 * HTTP observability helpers.
 *
 * Provides structured API request logging and response correlation headers.
 */

import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { getRequestClientIp } from "@/server/security/rate-limit";
import { getRequestId, REQUEST_ID_HEADER } from "@/server/http/request-id";

type ApiRouteHandler = () => Promise<NextResponse>;

type ApiRouteLogMeta = {
  route: string;
};

function getRequestUserAgent(request: NextRequest) {
  return request.headers.get("user-agent");
}

function logApiEvent(payload: Record<string, unknown>) {
  console.info(JSON.stringify(payload));
}

export async function withApiRouteLogging(
  request: NextRequest,
  meta: ApiRouteLogMeta,
  handler: ApiRouteHandler
) {
  const requestId = getRequestId(request);
  const startedAt = Date.now();

  try {
    const response = await handler();
    const durationMs = Date.now() - startedAt;

    response.headers.set(REQUEST_ID_HEADER, requestId);

    logApiEvent({
      durationMs,
      ipAddress: getRequestClientIp(request),
      method: request.method,
      requestId,
      route: meta.route,
      statusCode: response.status,
      timestamp: new Date().toISOString(),
      userAgent: getRequestUserAgent(request),
    });

    return response;
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    logApiEvent({
      durationMs,
      error: error instanceof Error ? error.message : "Unknown route error",
      ipAddress: getRequestClientIp(request),
      method: request.method,
      requestId,
      route: meta.route,
      statusCode: 500,
      timestamp: new Date().toISOString(),
      userAgent: getRequestUserAgent(request),
    });

    throw error;
  }
}
