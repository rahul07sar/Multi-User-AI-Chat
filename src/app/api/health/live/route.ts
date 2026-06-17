/**
 * Liveness health API route.
 *
 * Returns basic process health without dependency checks.
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiRouteLogging } from "@/server/http/observability";
import { getLivenessReport } from "@/server/health.service";

export async function GET(request: NextRequest) {
  return withApiRouteLogging(request, { route: "health.live" }, async () =>
    NextResponse.json(getLivenessReport())
  );
}
