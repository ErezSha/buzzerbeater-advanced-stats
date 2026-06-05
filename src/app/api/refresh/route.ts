import { NextResponse } from "next/server";
import type { RefreshApiResponse } from "@/lib/api-types";
import { loadDashboardData } from "@/server/data/load-dashboard-data";
import { toApiError } from "@/server/data/api-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse<RefreshApiResponse>> {
  try {
    const { data, cacheStatus } = await loadDashboardData({ forceRefresh: true });

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
