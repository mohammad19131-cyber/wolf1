"use client";
import { useEffect, useState } from "react";
import Countdown from "./Countdown";

export default function ParticipantCompetitionStatus() {
  const [competition, setCompetition] = useState(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/competition", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      setCompetition(data.competition || null);
    }
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  if (!competition || competition.tableMissing) return null;

  const status = competition.status || "active";
  if (status === "active" && (!competition.timer || competition.timer.openEnded)) {
    return null;
  }

  return (
    <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: "rgba(232,199,122,0.12)", color: "#F3D393" }}>
      <span className="capitalize">{status}</span>
      {competition.timer && !competition.timer.openEnded && (
        <Countdown timer={competition.timer} />
      )}
    </div>
  );
}
