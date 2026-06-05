import { NextResponse } from "next/server";
import type { GameApiResponse } from "@/lib/api-types";
import { loadDashboardData } from "@/server/data/load-dashboard-data";
import { toApiError } from "@/server/data/api-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GameRouteContext {
  params: Promise<{
    matchId: string;
  }>;
}

export async function GET(
  _request: Request,
  context: GameRouteContext,
): Promise<NextResponse<GameApiResponse>> {
  try {
    const { matchId } = await context.params;
    const { data, cacheStatus } = await loadDashboardData();
    const boxScore = data.boxScores.find((candidate) => candidate.matchId === matchId);

    if (!boxScore) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "NotFound",
            message: "Box score is not available yet.",
            retryable: false,
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: boxScore,
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
