"use client";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Lock, Wallet } from "lucide-react";
import Navbar from "../components/Navbar";
import Countdown from "../components/Countdown";

export default function CrisisPage() {
  const [user, setUser] = useState(null);
  const [crisis, setCrisis] = useState(null);
  const [myDecision, setMyDecision] = useState(null);
  const [myResult, setMyResult] = useState(null);
  // No option is selected until the participant clicks one, or the server
  // reports an existing decision for the *current* crisis. This must never
  // be initialized to an option id or an array index.
  const [selected, setSelected] = useState(null);
  const lastCrisisIdRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchAll();
    const id = setInterval(() => fetchAll(true), 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  async function fetchAll(quiet = false) {
    if (!quiet) setLoading(true);

    const [userRes, crisisRes] = await Promise.all([
      fetch("/api/userinfo", { credentials: "include" }),
      fetch("/api/crisis", { credentials: "include" }),
    ]);

    if (userRes.status === 401 || crisisRes.status === 401) {
      window.location.href = "/login";
      return;
    }

    const userData = await userRes.json().catch(() => ({}));
    const crisisData = await crisisRes.json().catch(() => ({}));

    if (!userRes.ok || !userData.username) {
      window.location.href = "/login";
      return;
    }

    const nextCrisis = crisisData.crisis || null;
    const nextCrisisId = nextCrisis?.id ?? null;

    // If the active crisis changed (new crisis started, or none anymore),
    // drop any locally-held selection instead of carrying it over. Prevents
    // a selection made on a previous crisis from ever appearing "stale" on
    // a different one.
    if (nextCrisisId !== lastCrisisIdRef.current) {
      lastCrisisIdRef.current = nextCrisisId;
      setSelected(crisisData.myDecision?.selectedOptionId || null);
    } else if (crisisData.myDecision?.selectedOptionId) {
      // Keep selection in sync with the server once a decision exists.
      setSelected(crisisData.myDecision.selectedOptionId);
    }

    setUser(userData);
    setCrisis(nextCrisis);
    setMyDecision(crisisData.myDecision || null);
    setMyResult(crisisData.myResult || null);
    if (!quiet) setLoading(false);
  }

  async function handleLogout() {
    setLoggingOut(true);
    const res = await fetch("/api/logout", { method: "POST" });
    if (res.ok) window.location.href = "/";
    else {
      setError("Failed to logout");
      setLoggingOut(false);
    }
  }

  const submitted = Boolean(myDecision?.selectedOptionId);
  const windowClosed = !crisis || crisis.status !== "active" || crisis.timer?.expired;
  const choiceLocked = submitted || windowClosed;
  const isRevealed = crisis?.status === "revealed";
  const options = crisis?.options || [];

  function selectOption(id) {
    if (choiceLocked) return;
    setSelected(id);
  }

  async function handleSubmit() {
    setError("");
    setSuccess("");
    if (!selected) return setError("Select exactly one option");
    if (submitted) return setError("Decision already submitted and cannot be changed");
    setSubmitting(true);
    const res = await fetch("/api/crisis/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ crisisId: crisis.id, optionId: selected }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) return setError(data.error || "Failed to submit decision");
    setSuccess("Decision submitted");
    fetchAll(true);
  }

  function formatSignedMoney(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "$0";
    const abs = Math.abs(amount).toLocaleString();
    if (amount > 0) return `+$${abs}`;
    if (amount < 0) return `-$${abs}`;
    return "$0";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#14070A] via-[#0B0304] to-[#14070A] flex items-center justify-center">
        <div className="text-[#F3D393] text-xl">Loading...</div>
      </div>
    );
  }

  const currentCapital = Number(user?.balance ?? 0);
  const showCountdown = crisis?.status === "active" && crisis?.timer && !crisis.timer.openEnded;

  return (
    <>
      <style>{`
        .glass-effect {
          background: rgba(232, 199, 122, 0.08);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(232, 199, 122, 0.18);
        }
      `}</style>
      <Navbar onLogout={handleLogout} loading={loggingOut} />
      <main className="min-h-[calc(100vh-180px)] bg-gradient-to-br from-[#14070A] via-[#0B0304] to-[#14070A] font-sans text-white p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {(error || success) && (
            <div
              className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl p-3 rounded-lg backdrop-blur-md border text-sm shadow-2xl ${
                error ? "bg-red-500/90 border-red-400/50 text-white" : "bg-[#F3D393]/95 border-[#CBA158]/60 text-[#241006]"
              }`}
            >
              {error || success}
            </div>
          )}

          <div className="glass-effect rounded-xl p-3 sm:p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wallet className="text-[#E8C77A]" size={18} />
              <span className="text-sm" style={{ color: "#D3C3C5" }}>Current Capital:</span>
              <span className="font-bold text-lg text-[#F3D393]">${currentCapital.toLocaleString()}</span>
            </div>
            {user?.username && (
              <span className="text-sm" style={{ color: "#D3C3C5" }}>
                Team: <span className="text-white font-semibold">{user.username}</span>
              </span>
            )}
          </div>

          {!crisis ? (
            <div className="text-center py-20 bg-[#1B080C]/40 rounded-lg border border-[#3D171E]">
              <AlertTriangle className="mx-auto mb-3 text-[#5C232D]" size={40} />
              <p className="text-[#F3D393] text-lg font-semibold">No crisis is active right now</p>
              <p className="text-sm mt-1" style={{ color: "#D3C3C5" }}>Check back once the organizers start the next round.</p>
            </div>
          ) : (
            <>
              <header className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="text-[#E8C77A]" size={26} />
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#E8C77A] to-[#F5DFA3] bg-clip-text text-transparent">
                    {crisis.title}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs capitalize border ${
                      crisis.status === "active"
                        ? "bg-green-600/30 text-green-200 border-green-500/50"
                        : crisis.status === "locked"
                        ? "bg-yellow-600/30 text-yellow-200 border-yellow-500/50"
                        : crisis.status === "revealed"
                        ? "bg-blue-600/30 text-blue-200 border-blue-500/50"
                        : "bg-white/10 text-[#D3C3C5] border-white/20"
                    }`}
                  >
                    {crisis.status}
                  </span>
                  {!submitted && (
                    <span className="text-yellow-200 text-xs">No decision submitted</span>
                  )}
                  {choiceLocked && crisis.status !== "revealed" && (
                    <span className="flex items-center gap-1 text-[#F3D393] text-xs">
                      <Lock size={14} /> Locked
                    </span>
                  )}
                </div>
              </header>

              {showCountdown && (
                <div className="glass-effect rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2 text-[#F3D393]">
                    <Clock size={18} />
                    <span className="font-semibold">Crisis countdown</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
                    <Countdown timer={crisis.timer} />
                  </div>
                </div>
              )}

              <div className="bg-white/5 backdrop-blur-sm border border-[#3D171E] rounded-xl p-4 mb-4">
                <p className="text-sm" style={{ color: "#D3C3C5" }}>{crisis.scenario}</p>
              </div>

              {windowClosed && !submitted && !isRevealed && (
                <div className="flex items-center gap-2 bg-yellow-600/20 border border-yellow-500/40 rounded-xl p-3 mb-4 text-sm text-yellow-200">
                  <Lock size={16} /> Decision window is closed.
                </div>
              )}

              {submitted && !isRevealed && (
                <div className="flex items-center gap-2 bg-green-600/15 border border-green-500/30 rounded-xl p-3 mb-4 text-sm text-green-200">
                  <CheckCircle2 size={16} /> Your decision is locked and cannot be changed.
                </div>
              )}

              {isRevealed && (
                <div className="bg-white/5 border border-[#3D171E] rounded-xl p-4 mb-4 text-sm space-y-2">
                  {myResult?.submitted ? (
                    <>
                      <p className="font-semibold text-[#F3D393]">Reveal result</p>
                      {myResult.selectedOptionTitle && (
                        <p style={{ color: "#D3C3C5" }}>Selected: {myResult.selectedOptionTitle}</p>
                      )}
                      <p className={Number(myResult.financialEffect) >= 0 ? "text-green-400 text-lg font-bold" : "text-red-400 text-lg font-bold"}>
                        Financial result: {formatSignedMoney(myResult.financialEffect)}
                      </p>
                      {myResult.explanation && (
                        <p style={{ color: "#D3C3C5" }}>{myResult.explanation}</p>
                      )}
                      <p className="text-white">
                        Capital after reveal:{" "}
                        <span className="font-bold text-[#F3D393]">
                          ${Number(myResult.capitalAfter ?? currentCapital).toLocaleString()}
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-[#F3D393]">No decision submitted → $0</p>
                      <p className="text-green-400 text-lg font-bold">Financial result: $0</p>
                      <p className="text-white">
                        Capital after reveal:{" "}
                        <span className="font-bold text-[#F3D393]">
                          ${Number(myResult?.capitalAfter ?? currentCapital).toLocaleString()}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 mb-2">
                <h2 className="text-lg font-semibold">Decision Options</h2>
                <span className="text-xs" style={{ color: "#D3C3C5" }}>
                  {options.length}/8 choices
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                {options.map((opt) => {
                  const isSelected = selected === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => selectOption(opt.id)}
                      disabled={choiceLocked}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-[#E8C77A]/20 border-[#E8C77A] shadow-lg"
                          : "bg-black/20 border-[#3D171E] hover:border-[#E8C77A]/40"
                      } ${choiceLocked ? "opacity-80 cursor-default" : "cursor-pointer"}`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          #{opt.option_index} {opt.title}
                        </span>
                        {isSelected && <CheckCircle2 size={16} className="text-[#F3D393] shrink-0" />}
                      </div>
                      {opt.description && (
                        <p className="text-xs" style={{ color: "#D3C3C5" }}>{opt.description}</p>
                      )}
                    </button>
                  );
                })}
              </div>

              {!choiceLocked && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !selected}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#E8C77A] to-[#F5DFA3] text-[#241006] rounded-xl font-semibold shadow-lg disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Decision"}
                </button>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
