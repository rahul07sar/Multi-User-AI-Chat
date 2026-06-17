/**
 * Readiness health API route.
 *
 * Returns dependency readiness for database, migrations, and OpenAI config.
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiRouteLogging } from "@/server/http/observability";
import { getReadinessReport } from "@/server/health.service";

export async function GET(request: NextRequest) {
  return withApiRouteLogging(request, { route: "health.ready" }, async () => {
    const report = await getReadinessReport();

    return NextResponse.json(report, {
      status: report.status === "ok" ? 200 : 503,
    });
  });
}
