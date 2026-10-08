import { NextResponse } from "next/server";
import { createServerClient, hasSupabaseConfig } from "../../lib/supabase";
import { requireUser } from "../../lib/auth";
import { executeTrade } from "../../lib/trading";
import { assertCompetitionActive } from "../../lib/competition";

const RETIRED = NextResponse.json(
  { error: "Stock trading is no longer part of the competition" },
  { status: 410 }
);

export async function POST(req) {
  return RETIRED;

  try {
    const { user, response } = await requireUser(req);
    if (response) return response;

    if (!hasSupabaseConfig()) {
      return NextResponse.json(
        { error: "Database is not configured" },
        { status: 503 }
      );
    }

    const supabase = createServerClient();
    const gate = await assertCompetitionActive(supabase);
    if (gate.error) {
      return NextResponse.json({ error: gate.error.message }, { status: gate.error.status });
    }

    const { stockId, quantity } = await req.json();
    const result = await executeTrade(supabase, user.username, "buy", stockId, quantity);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("BUY ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
