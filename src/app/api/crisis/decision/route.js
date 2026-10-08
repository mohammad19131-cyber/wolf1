import { NextResponse } from "next/server";
import { createServerClient, hasSupabaseConfig } from "../../../lib/supabase";
import { requireUser } from "../../../lib/auth";
import { assertCompetitionActive } from "../../../lib/competition";
import { assertCrisisOpenForSubmission, lockExpiredCrisis } from "../../../lib/crisis";

function parseOptionId(body) {
  if (!body || typeof body !== "object") return null;
  if (body.optionId) return String(body.optionId);
  if (Array.isArray(body.optionIds)) {
    if (body.optionIds.length !== 1) return null;
    return body.optionIds[0] ? String(body.optionIds[0]) : null;
  }
  return null;
}

export async function POST(req) {
  try {
    const { user, response } = await requireUser(req);
    if (response) return response;

    const body = await req.json();
    const crisisId = body.crisisId;
    const optionIds = body.optionIds;
    const optionId = parseOptionId(body);

    if (Array.isArray(optionIds) && optionIds.length !== 1) {
      return NextResponse.json({ error: "Select exactly one option" }, { status: 400 });
    }
    if (!crisisId || !optionId) {
      return NextResponse.json({ error: "Select exactly one option" }, { status: 400 });
    }

    if (!hasSupabaseConfig()) {
      return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
    }

    const supabase = createServerClient();

    const gate = await assertCompetitionActive(supabase);
    if (gate.error) {
      return NextResponse.json({ error: gate.error.message }, { status: gate.error.status });
    }

    const { data: existingCrisis, error: crisisError } = await supabase
      .from("crises")
      .select("*")
      .eq("id", crisisId)
      .single();
    if (crisisError || !existingCrisis) {
      return NextResponse.json({ error: "Crisis not found" }, { status: 404 });
    }

    const crisis = await lockExpiredCrisis(supabase, existingCrisis);
    const openCheck = assertCrisisOpenForSubmission(crisis);
    if (openCheck.error) {
      return NextResponse.json({ error: openCheck.error.message }, { status: openCheck.error.status });
    }

    const { data: validOption, error: optionsError } = await supabase
      .from("crisis_options")
      .select("id")
      .eq("crisis_id", crisisId)
      .eq("id", optionId)
      .maybeSingle();
    if (optionsError) {
      return NextResponse.json({ error: "Failed to validate option" }, { status: 500 });
    }
    if (!validOption) {
      return NextResponse.json({ error: "Invalid option for this crisis" }, { status: 400 });
    }

    const { data: existingDecision } = await supabase
      .from("team_decisions")
      .select("id, selected_option_id, locked")
      .eq("crisis_id", crisisId)
      .eq("username", user.username)
      .maybeSingle();

    if (existingDecision) {
      return NextResponse.json({ error: "Decision already submitted and cannot be changed" }, { status: 409 });
    }

    const { data: recheck } = await supabase
      .from("crises")
      .select("status, starts_at, ends_at")
      .eq("id", crisisId)
      .single();
    const stillOpen = assertCrisisOpenForSubmission(recheck || crisis);
    if (stillOpen.error) {
      return NextResponse.json({ error: stillOpen.error.message }, { status: stillOpen.error.status });
    }

    const { data: decision, error: insertError } = await supabase
      .from("team_decisions")
      .insert([{
        crisis_id: crisisId,
        username: user.username,
        selected_option_id: optionId,
        locked: true,
      }])
      .select("id, selected_option_id, submitted_at, locked")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "Decision already submitted and cannot be changed" }, { status: 409 });
      }
      console.error("Crisis decision insert error:", insertError.message);
      return NextResponse.json({ error: "Failed to save decision" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      selectedOptionId: decision.selected_option_id,
      locked: true,
    });
  } catch (err) {
    console.error("Crisis decision POST error:", err);
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}
