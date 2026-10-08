import { NextResponse } from "next/server";
import { createServerClient, hasSupabaseConfig } from "../../lib/supabase";
import { requireAdmin } from "../../lib/auth";
import { getCompetition, setCompetitionState } from "../../lib/competition";

export async function GET() {
  try {
    if (!hasSupabaseConfig()) {
      const competition = await getCompetition(null);
      return NextResponse.json({ competition });
    }

    const supabase = createServerClient();
    const competition = await getCompetition(supabase);
    return NextResponse.json({ competition });
  } catch (err) {
    console.error("Competition GET error:", err);
    return NextResponse.json({ error: "Failed to load competition" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { response } = await requireAdmin(req);
    if (response) return response;

    if (!hasSupabaseConfig()) {
      return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
    }

    const body = await req.json();
    const status = body.status || body.action;
    const durationSeconds = body.durationSeconds;
    const supabase = createServerClient();
    const result = await setCompetitionState(supabase, { status, durationSeconds });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 400 });
    }

    return NextResponse.json({ success: true, competition: result.competition });
  } catch (err) {
    console.error("Competition PUT error:", err);
    return NextResponse.json({ error: "Failed to update competition" }, { status: 500 });
  }
}
