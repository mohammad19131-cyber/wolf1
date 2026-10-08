import { computeTimer, endsAtFromDuration } from "./timer";
import { hasSupabaseConfig } from "./supabase";

export const COMPETITION_STATES = ["waiting", "active", "paused", "ended"];

const DEFAULT_ROW = {
  id: 1,
  status: "active",
  starts_at: null,
  ends_at: null,
  pause_remaining_ms: null,
};

function serialize(row, extra = {}) {
  const now = Date.now();
  const timer = computeTimer({
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    serverNow: now,
  });
  return {
    id: row.id ?? 1,
    status: row.status || "active",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    pauseRemainingMs: row.pause_remaining_ms ?? null,
    timer,
    serverNow: now,
    ...extra,
  };
}

export function participantActionsAllowed(status) {
  return status === "active";
}

export function participantBlockMessage(status) {
  if (status === "waiting") return "Competition has not started yet";
  if (status === "paused") return "Competition is paused";
  if (status === "ended") return "Competition has ended";
  return "Competition is not active";
}

export async function getCompetition(supabase) {
  if (!hasSupabaseConfig() || !supabase) {
    return serialize(DEFAULT_ROW, { tableMissing: true });
  }

  const { data, error } = await supabase
    .from("competition")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return serialize(DEFAULT_ROW, { tableMissing: true });
  }

  if (!data) {
    return serialize({ ...DEFAULT_ROW, status: "waiting" }, { tableMissing: false, uninitialized: true });
  }

  const snapshot = serialize(data, { tableMissing: false });
  if (data.status === "active" && snapshot.timer.expired) {
    const { data: ended } = await supabase
      .from("competition")
      .update({ status: "ended", updated_at: new Date().toISOString() })
      .eq("id", 1)
      .eq("status", "active")
      .select("*")
      .maybeSingle();
    if (ended) return serialize(ended, { tableMissing: false });
    return serialize({ ...data, status: "ended" }, { tableMissing: false });
  }

  return snapshot;
}

export async function assertCompetitionActive(supabase) {
  const competition = await getCompetition(supabase);
  if (competition.tableMissing) return { competition, error: null };
  if (!participantActionsAllowed(competition.status)) {
    return {
      competition,
      error: {
        message: participantBlockMessage(competition.status),
        status: 403,
      },
    };
  }
  return { competition, error: null };
}

export async function setCompetitionState(supabase, { status, durationSeconds } = {}) {
  if (!COMPETITION_STATES.includes(status)) {
    return { error: "Invalid competition status", statusCode: 400 };
  }

  const current = await getCompetition(supabase);
  if (current.tableMissing) {
    return {
      error: "Competition table is not configured. Run supabase/schema.sql.",
      statusCode: 503,
    };
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const patch = {
    id: 1,
    status,
    updated_at: nowIso,
  };

  if (status === "waiting") {
    patch.starts_at = null;
    patch.ends_at = null;
    patch.pause_remaining_ms = null;
  } else if (status === "ended") {
    patch.ends_at = current.endsAt || nowIso;
    patch.pause_remaining_ms = null;
  } else if (status === "paused") {
    if (current.endsAt && !current.timer.expired && !current.timer.openEnded) {
      patch.pause_remaining_ms = current.timer.remainingMs;
    } else {
      patch.pause_remaining_ms = current.pauseRemainingMs;
    }
    patch.starts_at = current.startsAt;
    patch.ends_at = null;
  } else if (status === "active") {
    const resumeMs = Number(current.pauseRemainingMs);
    const durationMs = Number(durationSeconds) > 0 ? Number(durationSeconds) * 1000 : null;
    patch.starts_at = nowIso;
    patch.pause_remaining_ms = null;
    if (durationMs) {
      patch.ends_at = endsAtFromDuration(durationSeconds, now);
    } else if (Number.isFinite(resumeMs) && resumeMs > 0) {
      patch.ends_at = new Date(now + resumeMs).toISOString();
    } else if (current.endsAt && !current.timer.expired) {
      patch.ends_at = new Date(current.endsAt).toISOString();
    } else {
      patch.ends_at = null;
    }
  }

  const { data, error } = await supabase
    .from("competition")
    .upsert(patch, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return { error: error.message || "Failed to update competition", statusCode: 500 };
  }

  return { competition: serialize(data, { tableMissing: false }) };
}
