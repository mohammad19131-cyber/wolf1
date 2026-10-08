"use client";
import { useEffect, useState } from "react";
import { formatRemaining, interpolateRemainingMs } from "../lib/timer";

export default function Countdown({ timer, expiredLabel = "Expired" }) {
  const [receivedAt, setReceivedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setReceivedAt(Date.now());
  }, [timer?.serverNow, timer?.endsAt, timer?.remainingMs]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  if (!timer || timer.openEnded || timer.remainingMs == null) return null;

  const remaining = interpolateRemainingMs(timer, receivedAt, now);
  if (remaining == null) return null;
  return remaining <= 0 ? expiredLabel : formatRemaining(remaining);
}
