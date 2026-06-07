import { NextResponse } from "next/server";
import type { PlayerAnalysisApiResponse } from "@/lib/api-types";
import { analyzeSinglePlayer } from "@/server/data/analyze-single-player";
import { toApiError } from "@/server/data/api-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PlayerRouteContext {
  params: Promise<{
    playerId: string;
  }>;
}

export async function GET(
  _request: Request,
  context: PlayerRouteContext,
): Promise<NextResponse<PlayerAnalysisApiResponse>> {
  try {
    const { playerId } = await context.params;
    const data = await analyzeSinglePlayer(playerId);

    return NextResponse.json({
      ok: true,
      data,
      refreshedAt: data.refreshedAt,
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
