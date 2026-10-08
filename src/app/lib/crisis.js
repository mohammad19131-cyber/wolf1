// Wolf of Tech Street crisis engine.
// Hidden option fields must never be sent to participants before reveal.
// Reveal applies each team's selected financial_effect to users.balance exactly once.
// Payout is resumable: crisis_results is the per-team processing record.

import { computeTimer, endsAtFromDuration } from "./timer.js";

export const CRISIS_STATES = ["draft", "active", "locked", "revealed"];
export const REQUIRED_OPTION_COUNT = 8;
export const MAX_CRISES = 12;
export const STARTING_CAPITAL = 10000;
export const DEFAULT_CRISIS_DURATION_SECONDS = 600;

export const PARTICIPANT_OPTION_COLUMNS = "id, crisis_id, option_index, title, description, category";

const HIDDEN_OPTION_FIELDS = ["financial_effect", "explanation", "outcome_type"];

export function serializeOption(option, { includeHidden = false } = {}) {
  if (!option) return option;
  const clean = {
    id: option.id,
    crisis_id: option.crisis_id,
    option_index: option.option_index,
    title: option.title,
    description: option.description,
    category: option.category,
  };
  if (includeHidden) {
    clean.financial_effect = option.financial_effect;
    clean.explanation = option.explanation;
  }
  return clean;
}

export function isCrisisRevealed(crisis) {
  return Boolean(crisis && (crisis.status === "revealed" || crisis.revealed === true));
}

export function serializeCrisis(crisis, options = [], { includeHidden = false, serverNow = Date.now() } = {}) {
  if (!crisis) return null;
  const revealed = isCrisisRevealed(crisis);
  const timer = computeTimer({
    startsAt: crisis.starts_at,
    endsAt: crisis.ends_at,
    serverNow,
  });
  return {
    id: crisis.id,
    title: crisis.title,
    scenario: crisis.scenario,
    status: revealed ? "revealed" : crisis.status,
    revealed,
    durationSeconds: crisis.duration_seconds,
    startsAt: crisis.starts_at,
    endsAt: crisis.ends_at,
    createdAt: crisis.created_at,
    timer,
    serverNow,
    options: (options || [])
      .slice()
      .sort((a, b) => Number(a.option_index) - Number(b.option_index))
      .map((opt) => serializeOption(opt, { includeHidden })),
  };
}

export function serializeOwnResult(row, optionTitle = null) {
  if (!row) return null;
  const effect = Number(row.financial_effect);
  const before = Number(row.capital_before);
  const after = Number(row.capital_after);
  return {
    submitted: Boolean(row.submitted),
    selectedOptionId: row.selected_option_id || null,
    selectedOptionTitle: optionTitle,
    financialEffect: Number.isFinite(effect) ? effect : 0,
    explanation: row.explanation || null,
    capitalBefore: Number.isFinite(before) ? before : 0,
    capitalAfter: Number.isFinite(after) ? after : 0,
  };
}

export function stripHiddenFromPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (Array.isArray(payload)) return payload.map(stripHiddenFromPayload);
  const clean = { ...payload };
  for (const field of HIDDEN_OPTION_FIELDS) delete clean[field];
  if (clean.options) clean.options = stripHiddenFromPayload(clean.options);
  if (clean.crisis) clean.crisis = stripHiddenFromPayload(clean.crisis);
  return clean;
}

async function fetchOptions(supabase, crisisId, { includeHidden = false } = {}) {
  const columns = includeHidden ? "*" : PARTICIPANT_OPTION_COLUMNS;
  const { data, error } = await supabase
    .from("crisis_options")
    .select(columns)
    .eq("crisis_id", crisisId)
    .order("option_index", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function lockExpiredCrisis(supabase, crisis) {
  if (!crisis) return crisis;
  const timer = computeTimer({ startsAt: crisis.starts_at, endsAt: crisis.ends_at });
  if (crisis.status === "active" && timer.expired) {
    const { data } = await supabase
      .from("crises")
      .update({ status: "locked" })
      .eq("id", crisis.id)
      .eq("status", "active")
      .select("*")
      .maybeSingle();
    return data || { ...crisis, status: "locked" };
  }
  return crisis;
}

export async function getCurrentCrisis(supabase) {
  if (!supabase) return null;

  const { data: active } = await supabase
    .from("crises")
    .select("*")
    .eq("status", "active")
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let crisis = active || null;

  if (!crisis) {
    const { data: locked } = await supabase
      .from("crises")
      .select("*")
      .eq("status", "locked")
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    crisis = locked || null;
  }

  if (!crisis) {
    const { data: revealed } = await supabase
      .from("crises")
      .select("*")
      .eq("status", "revealed")
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    crisis = revealed || null;
  }

  if (!crisis) {
    const { data: flagged } = await supabase
      .from("crises")
      .select("*")
      .eq("revealed", true)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    crisis = flagged || null;
  }

  if (!crisis) return null;

  if (isCrisisRevealed(crisis)) return crisis;
  return lockExpiredCrisis(supabase, crisis);
}

export function computeTeamPayout({ balance, decision, option }) {
  const parsed = Number(balance);
  const capitalBefore = Number.isFinite(parsed) ? parsed : 0;

  if (!decision) {
    return {
      submitted: false,
      selectedOptionId: null,
      financialEffect: 0,
      explanation: null,
      capitalBefore,
      capitalAfter: capitalBefore,
    };
  }

  // TODO — awaiting competition specification: negative capital is currently
  // allowed (capitalAfter = capitalBefore + financialEffect with no floor).
  const raw = option == null ? 0 : Number(option.financial_effect);
  const financialEffect = Number.isFinite(raw) ? raw : 0;
  return {
    submitted: true,
    selectedOptionId: decision.selected_option_id,
    financialEffect,
    explanation: option?.explanation ?? null,
    capitalBefore,
    capitalAfter: capitalBefore + financialEffect,
  };
}

async function applyBalanceDelta(supabase, username, capitalBefore, capitalAfter) {
  if (capitalAfter === capitalBefore) return { ok: true, capitalBefore, capitalAfter };

  let expected = capitalBefore;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: updated } = await supabase
      .from("users")
      .update({ balance: expected + (capitalAfter - capitalBefore) })
      .eq("username", username)
      .eq("balance", expected)
      .select("username, balance")
      .maybeSingle();

    if (updated) {
      return { ok: true, capitalBefore: expected, capitalAfter: Number(updated.balance) };
    }

    const { data: fresh } = await supabase
      .from("users")
      .select("balance")
      .eq("username", username)
      .single();
    if (!fresh) return { ok: false };
    expected = Number(fresh.balance);
  }

  return { ok: false };
}

export function processedUsernames(resultRows) {
  return new Set((resultRows || []).map((row) => row?.username).filter(Boolean));
}

export function usersNeedingPayout(users, resultRows) {
  const done = processedUsernames(resultRows);
  return (users || []).filter((user) => user?.username && !done.has(user.username));
}

// Insert the crisis_results row first. That UNIQUE row is the per-team claim:
// the winner applies the balance delta; a 23505 / existing row means skip.
export async function settleTeamReveal({ existingResult, payout, claimResult, applyBalance }) {
  if (existingResult) {
    return { skipped: true, paid: false, reason: "already-processed" };
  }

  const claimed = await claimResult(payout);
  if (!claimed?.inserted) {
    return { skipped: true, paid: false, reason: claimed?.reason || "claim-lost" };
  }

  const shouldPay = payout.submitted && payout.financialEffect !== 0;
  if (!shouldPay) {
    return { skipped: false, paid: false, result: claimed.inserted };
  }

  const applied = await applyBalance(payout);
  return {
    skipped: false,
    paid: Boolean(applied?.ok),
    result: claimed.inserted,
  };
}

async function claimCrisisReveal(supabase, crisisId) {
  const { data: claimed, error: claimError } = await supabase
    .from("crises")
    .update({ status: "revealed", revealed: true })
    .eq("id", crisisId)
    .eq("status", "locked")
    .eq("revealed", false)
    .select("*")
    .maybeSingle();

  if (!claimError && claimed) return { crisis: claimed, error: null };

  const fallback = await supabase
    .from("crises")
    .update({ revealed: true })
    .eq("id", crisisId)
    .eq("status", "locked")
    .eq("revealed", false)
    .select("*")
    .maybeSingle();

  if (fallback.error) return { crisis: null, error: fallback.error };
  return { crisis: fallback.data || null, error: null };
}

async function settleUnprocessedTeams(supabase, crisisId) {
  const { data: existingRows } = await supabase
    .from("crisis_results")
    .select("username")
    .eq("crisis_id", crisisId);
  const done = processedUsernames(existingRows);

  const { data: options } = await supabase
    .from("crisis_options")
    .select("id, financial_effect, explanation, title")
    .eq("crisis_id", crisisId);
  const optionMap = new Map((options || []).map((o) => [o.id, o]));

  const { data: decisions } = await supabase
    .from("team_decisions")
    .select("username, selected_option_id")
    .eq("crisis_id", crisisId);
  const decisionMap = new Map((decisions || []).map((d) => [d.username, d]));

  const { data: users } = await supabase.from("users").select("username, balance");
  const remaining = usersNeedingPayout(users, existingRows);
  const results = [];
  let newlyInserted = 0;

  for (const user of remaining) {
    if (done.has(user.username)) continue;

    const decision = decisionMap.get(user.username) || null;
    const option = decision ? optionMap.get(decision.selected_option_id) : null;
    const payout = computeTeamPayout({
      balance: user.balance,
      decision,
      option,
    });

    const outcome = await settleTeamReveal({
      existingResult: done.has(user.username),
      payout,
      claimResult: async (computed) => {
        const { data: inserted, error: insertError } = await supabase
          .from("crisis_results")
          .insert([{
            crisis_id: crisisId,
            username: user.username,
            selected_option_id: computed.selectedOptionId,
            financial_effect: computed.financialEffect,
            explanation: computed.explanation,
            submitted: computed.submitted,
            capital_before: computed.capitalBefore,
            capital_after: computed.capitalAfter,
          }])
          .select("*")
          .maybeSingle();

        if (insertError && insertError.code === "23505") {
          return { inserted: null, reason: "already-processed" };
        }
        if (!inserted) return { inserted: null, reason: "claim-lost" };
        return { inserted };
      },
      applyBalance: async (computed) => applyBalanceDelta(
        supabase,
        user.username,
        computed.capitalBefore,
        computed.capitalAfter
      ),
    });

    if (outcome.result) {
      newlyInserted += 1;
      done.add(user.username);
      results.push(outcome.result);
    }
  }

  return { results, newlyInserted };
}

export async function revealCrisis(supabase, crisisId) {
  const { data: existing, error: fetchError } = await supabase
    .from("crises")
    .select("*")
    .eq("id", crisisId)
    .single();
  if (fetchError || !existing) return { error: "Crisis not found", status: 404 };

  const crisis = await lockExpiredCrisis(supabase, existing);
  let working = crisis;
  let claimedThisRequest = false;

  if (!isCrisisRevealed(working)) {
    if (working.status !== "locked") {
      return { error: "Lock the crisis before revealing", status: 400 };
    }

    const claimed = await claimCrisisReveal(supabase, crisisId);
    if (claimed.error) {
      return { error: "Failed to reveal crisis", status: 500 };
    }
    if (claimed.crisis) {
      working = claimed.crisis;
      claimedThisRequest = true;
    } else {
      const { data: again } = await supabase
        .from("crises")
        .select("*")
        .eq("id", crisisId)
        .single();
      if (!isCrisisRevealed(again)) {
        return { error: "Crisis already revealed", status: 409, alreadyRevealed: true };
      }
      working = again;
    }
  }

  const { results, newlyInserted } = await settleUnprocessedTeams(supabase, crisisId);

  if (!claimedThisRequest && newlyInserted === 0) {
    return { error: "Crisis already revealed", status: 409, alreadyRevealed: true };
  }

  return { crisis: working, results, resumed: !claimedThisRequest };
}

export async function getCrisisWithOptions(supabase, crisisId, { includeHidden = false } = {}) {
  const { data: crisis, error } = await supabase
    .from("crises")
    .select("*")
    .eq("id", crisisId)
    .single();
  if (error || !crisis) return null;

  const current = isCrisisRevealed(crisis) ? crisis : await lockExpiredCrisis(supabase, crisis);
  const options = await fetchOptions(supabase, crisisId, { includeHidden });
  return serializeCrisis(current, options, { includeHidden, serverNow: Date.now() });
}

export function assertCrisisOpenForSubmission(crisis) {
  if (!crisis) return { error: { message: "No crisis is currently open", status: 404 } };
  if (isCrisisRevealed(crisis) || crisis.status !== "active") {
    return { error: { message: "Submissions are closed", status: 403 } };
  }
  const timer = computeTimer({ startsAt: crisis.starts_at, endsAt: crisis.ends_at });
  if (timer.expired) {
    return { error: { message: "Decision window has expired", status: 403 } };
  }
  return { error: null };
}

export function startPatch(durationSeconds, now = Date.now()) {
  const seconds = Number(durationSeconds) > 0
    ? Number(durationSeconds)
    : DEFAULT_CRISIS_DURATION_SECONDS;
  return {
    status: "active",
    starts_at: new Date(now).toISOString(),
    ends_at: endsAtFromDuration(seconds, now),
    duration_seconds: seconds,
    revealed: false,
  };
}
