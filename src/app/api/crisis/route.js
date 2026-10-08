import { NextResponse } from "next/server";
import { createServerClient, hasSupabaseConfig } from "../../lib/supabase";
import { requireUser } from "../../lib/auth";
import {
  getCurrentCrisis,
  serializeCrisis,
  serializeOwnResult,
  PARTICIPANT_OPTION_COLUMNS,
  stripHiddenFromPayload,
  isCrisisRevealed,
} from "../../lib/crisis";

export async function GET(req) {
  try {
    const { user, response } = await requireUser(req);
    if (response) return response;

    if (!hasSupabaseConfig()) {
      return NextResponse.json({ crisis: null, myDecision: null, myResult: null });
    }

    const supabase = createServerClient();
    const crisis = await getCurrentCrisis(supabase);

    if (!crisis) {
      return NextResponse.json({ crisis: null, myDecision: null, myResult: null });
    }

    const { data: options } = await supabase
      .from("crisis_options")
      .select(PARTICIPANT_OPTION_COLUMNS)
      .eq("crisis_id", crisis.id)
      .order("option_index", { ascending: true });

    const serialized = stripHiddenFromPayload(
      serializeCrisis(crisis, options || [], { includeHidden: false })
    );

    const { data: decision } = await supabase
      .from("team_decisions")
      .select("selected_option_id, submitted_at, locked")
      .eq("crisis_id", crisis.id)
      .eq("username", user.username)
      .maybeSingle();

    let myResult = null;
    if (isCrisisRevealed(crisis)) {
      const { data: resultRow } = await supabase
        .from("crisis_results")
        .select("username, selected_option_id, financial_effect, explanation, submitted, capital_before, capital_after")
        .eq("crisis_id", crisis.id)
        .eq("username", user.username)
        .maybeSingle();

      if (resultRow && resultRow.username === user.username) {
        const ownOption = (options || []).find((o) => o.id === resultRow.selected_option_id);
        myResult = serializeOwnResult(resultRow, ownOption?.title || null);
      }
    }

    return NextResponse.json({
      crisis: serialized,
      myDecision: decision
        ? {
            submittedAt: decision.submitted_at,
            locked: decision.locked !== false,
            selectedOptionId: decision.selected_option_id,
          }
        : null,
      myResult,
    });
  } catch (err) {
    console.error("Crisis GET error:", err);
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}
