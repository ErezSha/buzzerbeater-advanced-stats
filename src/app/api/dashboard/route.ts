import { NextResponse } from "next/server";
import type { DashboardApiResponse } from "@/lib/api-types";
import { loadDashboardData } from "@/server/data/load-dashboard-data";
import { toApiError } from "@/server/data/api-errors";
import { bbapiClient } from "@/lib/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<DashboardApiResponse>> {
  try {
    const { data, cacheStatus } = await loadDashboardData({
      client: bbapiClient,
    });

    return NextResponse.json({
      ok: true,
      data,
      refreshedAt: data.refreshedAt,
      cacheStatus,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: toApiError(error),
      },
      { status: 500 },
    );
  }
}
