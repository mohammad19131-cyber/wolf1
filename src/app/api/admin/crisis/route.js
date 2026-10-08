import { NextResponse } from "next/server";
import { createServerClient, hasSupabaseConfig } from "../../../lib/supabase";
import { requireAdmin } from "../../../lib/auth";
import {
  REQUIRED_OPTION_COUNT,
  MAX_CRISES,
  DEFAULT_CRISIS_DURATION_SECONDS,
  getCrisisWithOptions,
  lockExpiredCrisis,
  startPatch,
  revealCrisis,
  isCrisisRevealed,
} from "../../../lib/crisis";

export async function GET(req) {
  try {
    const { response } = await requireAdmin(req);
    if (response) return response;

    if (!hasSupabaseConfig()) {
      return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      const { data: crises, error } = await supabase
        .from("crises")
        .select("id, title, status, revealed, duration_seconds, starts_at, ends_at, created_at")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Admin crisis list error:", error.message);
        return NextResponse.json({ error: "Failed to fetch crises" }, { status: 500 });
      }
      return NextResponse.json({ crises: crises || [] });
    }

    const crisis = await getCrisisWithOptions(supabase, id, { includeHidden: true });
    if (!crisis) return NextResponse.json({ error: "Crisis not found" }, { status: 404 });

    const { data: decisions } = await supabase
      .from("team_decisions")
      .select("id, username, selected_option_id, submitted_at, locked")
      .eq("crisis_id", id);

    const submissions = (decisions || []).map((d) => ({
      username: d.username,
      submittedAt: d.submitted_at,
      locked: d.locked !== false,
      selectedOptionId: d.selected_option_id,
    }));

    let results = [];
    if (isCrisisRevealed(crisis)) {
      const { data } = await supabase
        .from("crisis_results")
        .select("username, selected_option_id, financial_effect, explanation, submitted, capital_before, capital_after, processed_at")
        .eq("crisis_id", id)
        .order("username", { ascending: true });
      results = data || [];
    }

    const { count } = await supabase.from("users").select("username", { count: "exact", head: true });

    return NextResponse.json({ crisis, submissions, results, totalTeams: count || 0 });
  } catch (err) {
    console.error("Admin crisis GET error:", err);
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { response } = await requireAdmin(req);
    if (response) return response;

    if (!hasSupabaseConfig()) {
      return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
    }

    const body = await req.json();
    const { title, scenario, options } = body;
    const durationSeconds = Number(body.durationSeconds) > 0
      ? Number(body.durationSeconds)
      : DEFAULT_CRISIS_DURATION_SECONDS;

    if (!title || !scenario) {
      return NextResponse.json({ error: "Title and scenario are required" }, { status: 400 });
    }
    if (!Array.isArray(options) || options.length !== REQUIRED_OPTION_COUNT) {
      return NextResponse.json(
        { error: `Exactly ${REQUIRED_OPTION_COUNT} decision options are required` },
        { status: 400 }
      );
    }
    if (options.some((o) => !o || !o.title)) {
      return NextResponse.json({ error: "Every option needs at least a title" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { count } = await supabase.from("crises").select("id", { count: "exact", head: true });
    if ((count || 0) >= MAX_CRISES) {
      return NextResponse.json({ error: `A maximum of ${MAX_CRISES} crises is allowed` }, { status: 400 });
    }

    const { data: crisis, error: crisisError } = await supabase
      .from("crises")
      .insert([{
        title,
        scenario,
        status: "draft",
        revealed: false,
        duration_seconds: durationSeconds,
      }])
      .select("*")
      .single();

    if (crisisError || !crisis) {
      console.error("Admin crisis create error:", crisisError?.message);
      return NextResponse.json({ error: "Failed to create crisis" }, { status: 500 });
    }

    const rows = options.map((o, idx) => ({
      crisis_id: crisis.id,
      option_index: idx + 1,
      title: o.title,
      description: o.description || null,
      category: o.category || null,
      financial_effect: o.financialEffect != null && o.financialEffect !== "" ? Number(o.financialEffect) : null,
      explanation: o.explanation || null,
    }));

    const { error: optionsError } = await supabase.from("crisis_options").insert(rows);
    if (optionsError) {
      await supabase.from("crises").delete().eq("id", crisis.id);
      console.error("Admin crisis options create error:", optionsError.message);
      return NextResponse.json({ error: "Failed to create decision options" }, { status: 500 });
    }

    const full = await getCrisisWithOptions(supabase, crisis.id, { includeHidden: true });
    return NextResponse.json({ success: true, crisis: full });
  } catch (err) {
    console.error("Admin crisis POST error:", err);
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { response } = await requireAdmin(req);
    if (response) return response;

    const { id, action, durationSeconds } = await req.json();
    if (!id || !action) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (action !== "start" && action !== "lock" && action !== "reveal") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!hasSupabaseConfig()) {
      return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
    }

    const supabase = createServerClient();
    const { data: existing, error: fetchError } = await supabase
      .from("crises")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchError || !existing) {
      return NextResponse.json({ error: "Crisis not found" }, { status: 404 });
    }

    const crisis = await lockExpiredCrisis(supabase, existing);

    if (action === "start") {
      if (isCrisisRevealed(crisis) || crisis.status !== "draft") {
        return NextResponse.json({ error: "Only a draft crisis can be started" }, { status: 400 });
      }

      const { data: inFlight } = await supabase
        .from("crises")
        .select("id")
        .eq("status", "active")
        .neq("id", id)
        .limit(1)
        .maybeSingle();
      if (inFlight) {
        return NextResponse.json(
          { error: "Another crisis is already active. Lock it before starting a new one." },
          { status: 409 }
        );
      }

      const patch = startPatch(durationSeconds ?? crisis.duration_seconds);
      const { data: updated, error } = await supabase
        .from("crises")
        .update(patch)
        .eq("id", id)
        .eq("status", "draft")
        .select("*")
        .maybeSingle();
      if (error || !updated) {
        return NextResponse.json({ error: "Failed to start crisis" }, { status: 500 });
      }
      const full = await getCrisisWithOptions(supabase, id, { includeHidden: true });
      return NextResponse.json({ success: true, crisis: full });
    }

    if (action === "lock") {
      if (isCrisisRevealed(crisis)) {
        return NextResponse.json({ error: "Crisis already revealed" }, { status: 409 });
      }
      if (crisis.status !== "active") {
        return NextResponse.json({ error: "Only an active crisis can be locked" }, { status: 400 });
      }
      const { data: updated, error } = await supabase
        .from("crises")
        .update({ status: "locked" })
        .eq("id", id)
        .eq("status", "active")
        .select("*")
        .maybeSingle();
      if (error || !updated) {
        return NextResponse.json({ error: "Failed to lock crisis" }, { status: 500 });
      }
      const full = await getCrisisWithOptions(supabase, id, { includeHidden: true });
      return NextResponse.json({ success: true, crisis: full });
    }

    if (action === "reveal") {
      const result = await revealCrisis(supabase, id);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }
      const full = await getCrisisWithOptions(supabase, id, { includeHidden: true });
      return NextResponse.json({ success: true, crisis: full, results: result.results || [] });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Admin crisis PUT error:", err);
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { response } = await requireAdmin(req);
    if (response) return response;

    if (!hasSupabaseConfig()) {
      return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = createServerClient();
    const { data: crisis } = await supabase.from("crises").select("status").eq("id", id).single();
    if (!crisis) return NextResponse.json({ error: "Crisis not found" }, { status: 404 });
    if (crisis.status !== "draft") {
      return NextResponse.json({ error: "Only a draft crisis can be deleted" }, { status: 400 });
    }

    const { error } = await supabase.from("crises").delete().eq("id", id);
    if (error) {
      console.error("Admin crisis DELETE error:", error.message);
      return NextResponse.json({ error: "Failed to delete crisis" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin crisis DELETE error:", err);
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}
