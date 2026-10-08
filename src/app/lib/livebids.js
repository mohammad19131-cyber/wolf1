import { computeTimer, endsAtFromDuration } from "./timer";

export function serializeBid(bid, serverNow = Date.now()) {
  if (!bid) return bid;
  return {
    ...bid,
    timer: computeTimer({
      startsAt: bid.started_at,
      endsAt: bid.ends_at,
      serverNow,
    }),
  };
}

export async function expireBidIfNeeded(supabase, bid) {
  const now = Date.now();
  const timer = computeTimer({
    startsAt: bid?.started_at,
    endsAt: bid?.ends_at,
    serverNow: now,
  });

  if (bid?.status === "active" && timer.expired) {
    const { data } = await supabase
      .from("livebids")
      .update({ status: "inactive" })
      .eq("id", bid.id)
      .eq("status", "active")
      .select("*")
      .maybeSingle();
    return serializeBid(data || { ...bid, status: "inactive" }, now);
  }

  return serializeBid(bid, now);
}

export async function expireBids(supabase, bids = []) {
  const now = Date.now();
  return Promise.all(
    (bids || []).map((bid) => {
      const timer = computeTimer({
        startsAt: bid?.started_at,
        endsAt: bid?.ends_at,
        serverNow: now,
      });
      if (bid?.status === "active" && timer.expired) {
        return expireBidIfNeeded(supabase, bid);
      }
      return serializeBid(bid, now);
    })
  );
}

export function startPatch(bid, durationSeconds, now = Date.now()) {
  const duration = Number(durationSeconds) > 0
    ? Number(durationSeconds)
    : Number(bid?.duration_seconds) > 0
      ? Number(bid.duration_seconds)
      : null;

  return {
    status: "active",
    started_at: new Date(now).toISOString(),
    ends_at: duration ? endsAtFromDuration(duration, now) : null,
  };
}

export async function updateWithFallback(supabase, id, patch, fallbackPatch) {
  const { data, error } = await supabase
    .from("livebids")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (!error && data) return { data, error: null };

  if (fallbackPatch) {
    const fallback = await supabase
      .from("livebids")
      .update(fallbackPatch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return { data: fallback.data, error: fallback.error };
  }

  return { data, error };
}
