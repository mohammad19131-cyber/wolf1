"use client";
import { useEffect, useState } from "react";
import Countdown from "./Countdown";

const STATES = [
  { id: "waiting", label: "Waiting" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "ended", label: "Ended" },
];

export default function AdminCompetitionBar() {
  const [competition, setCompetition] = useState(null);
  const [duration, setDuration] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/competition", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setCompetition(data.competition || null);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  async function setStatus(status) {
    setError("");
    setLoading(true);
    const res = await fetch("/api/competition", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        status,
        durationSeconds: duration ? Number(duration) : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to update competition");
      return;
    }
    setCompetition(data.competition);
  }

  if (!competition) return null;

  return (
    <div className="border-t px-4 py-2" style={{ borderColor: "rgba(232,199,122,0.22)" }}>
      <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold" style={{ color: "#F3D393" }}>
          Competition:
        </span>
        <span className="capitalize" style={{ color: "#D3C3C5" }}>
          {competition.status}
        </span>
        {competition.timer && !competition.timer.openEnded && (
          <span style={{ color: "#F3D393" }}>
            <Countdown timer={competition.timer} />
          </span>
        )}
        {STATES.map((state) => (
          <button
            key={state.id}
            disabled={loading || competition.status === state.id}
            onClick={() => setStatus(state.id)}
            className="px-2 py-1 rounded disabled:opacity-50"
            style={
              competition.status === state.id
                ? { backgroundColor: "#E8C77A", color: "#241006" }
                : { backgroundColor: "rgba(42,11,16,0.6)", color: "#D3C3C5" }
            }
          >
            {state.label}
          </button>
        ))}
        <input
          type="number"
          min="1"
          placeholder="Round sec"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-24 px-2 py-1 rounded bg-[#2A0B10]/60 text-white border border-[#3D171E]"
        />
        {competition.tableMissing && (
          <span className="text-red-300">Run supabase/schema.sql</span>
        )}
        {error && <span className="text-red-300">{error}</span>}
      </div>
    </div>
  );
}
