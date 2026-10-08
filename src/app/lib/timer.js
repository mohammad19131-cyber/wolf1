export function computeTimer({ startsAt = null, endsAt = null, serverNow = Date.now() } = {}) {
  const start = startsAt ? new Date(startsAt).getTime() : null;
  const end = endsAt ? new Date(endsAt).getTime() : null;
  const startMs = Number.isFinite(start) ? start : null;
  const endMs = Number.isFinite(end) ? end : null;

  if (endMs == null) {
    return {
      startsAt: startMs,
      endsAt: null,
      serverNow,
      remainingMs: null,
      expired: false,
      openEnded: true,
    };
  }

  const remainingMs = Math.max(0, endMs - serverNow);
  return {
    startsAt: startMs,
    endsAt: endMs,
    serverNow,
    remainingMs,
    expired: remainingMs <= 0,
    openEnded: false,
  };
}

export function interpolateRemainingMs(timer, receivedAt, clientNow = Date.now()) {
  if (!timer || timer.openEnded || timer.remainingMs == null || receivedAt == null) {
    return null;
  }
  return Math.max(0, timer.remainingMs - (clientNow - receivedAt));
}

export function formatRemaining(ms) {
  if (ms == null) return "";
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function endsAtFromDuration(durationSeconds, now = Date.now()) {
  const seconds = Number(durationSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(now + seconds * 1000).toISOString();
}
