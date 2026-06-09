import { NextResponse } from "next/server";
import type { LeagueApiResponse } from "@/lib/api-types";
import { toApiError } from "@/server/data/api-errors";
import { refreshLeagueDataFull } from "@/server/data/refresh-league-data-full";
import { getRequestContext } from "@/server/data/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse<LeagueApiResponse>> {
  try {
    const { cache, client } = await getRequestContext();
    const { data, refreshedAt } = await refreshLeagueDataFull({ cache, client });

    return NextResponse.json({
      ok: true,
      data,
      refreshedAt,
      cacheStatus: { source: "refreshed", refreshedAt },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: toApiError(error) },
      { status: 500 },
    );
  }
}
