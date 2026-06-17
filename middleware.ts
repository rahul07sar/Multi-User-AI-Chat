/**
 * Application middleware.
 *
 * Applies request correlation IDs and global security headers.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSecurityHeaders } from "@/server/http/security-headers";

const REQUEST_ID_HEADER = "x-request-id";

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const requestId =
    request.headers.get(REQUEST_ID_HEADER)?.trim() || crypto.randomUUID();
  const securityHeaders = getSecurityHeaders({
    isDevelopment: process.env.NODE_ENV !== "production",
  });

  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set(REQUEST_ID_HEADER, requestId);

  for (const [headerName, headerValue] of securityHeaders.entries()) {
    response.headers.set(headerName, headerValue);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
