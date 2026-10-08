"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, Newspaper, AlertTriangle, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import Navbar from "../components/Navbar";
import Countdown from "../components/Countdown";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [news, setNews] = useState([]);
  const [crisis, setCrisis] = useState(null);
  const [myDecision, setMyDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  async function fetchData(quiet = false) {
    if (!quiet) setLoading(true);
    const [userRes, newsRes, crisisRes] = await Promise.all([
      fetch("/api/userinfo", { credentials: "include" }),
      fetch("/api/news"),
      fetch("/api/crisis", { credentials: "include" }),
    ]);

    if (userRes.status === 401 || crisisRes.status === 401) {
      window.location.href = "/login";
      return;
    }

    const userData = await userRes.json().catch(() => ({}));
    const newsData = await newsRes.json().catch(() => ({}));
    const crisisData = await crisisRes.json().catch(() => ({}));

    if (!userRes.ok || !userData.username) {
      window.location.href = "/login";
      return;
    }

    setUser(userData);
    setNews(newsData.news || []);
    setCrisis(crisisData.crisis || null);
    setMyDecision(crisisData.myDecision || null);
    if (!quiet) setLoading(false);
  }

  useEffect(() => {
    fetchData();
    const id = setInterval(() => fetchData(true), 5000);
    return () => clearInterval(id);
  }, []);

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

  function crisisStatusLabel() {
    if (!crisis) return "No active crisis";
    if (crisis.status === "active") {
      if (crisis.timer?.expired) return "Decision window closed";
      return submitted ? "Active — decision submitted" : "Active — awaiting your decision";
    }
    if (crisis.status === "locked") {
      return submitted ? "Locked — waiting for reveal" : "Locked — no decision submitted";
    }
    if (crisis.status === "revealed") return "Revealed";
    return crisis.status;
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#14070A] via-[#0B0304] to-[#14070A] flex items-center justify-center">
        <div className="text-[#F3D393] text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .animate-fadein {
          animation: fadein 1.2s cubic-bezier(.4,0,.2,1);
        }
        @keyframes fadein {
          0% { opacity: 0; transform: translateY(32px) scale(0.98); }
          60% { opacity: 0.7; transform: translateY(8px) scale(1.01); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .glass-effect {
          background: rgba(232, 199, 122, 0.08);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(232, 199, 122, 0.18);
        }
      `}</style>
      <Navbar onLogout={handleLogout} loading={loggingOut} />
      <main className="min-h-[calc(100vh-180px)] bg-gradient-to-br from-[#14070A] via-[#0B0304] to-[#14070A] font-sans text-white p-3 sm:p-4 md:p-6 overflow-x-hidden w-full pb-8">
        <div className="mx-auto px-2 sm:px-4 w-full max-w-5xl" style={{ overflowX: "hidden" }}>
          <header className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="w-full">
              <h1 className="text-xl sm:text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-[#E8C77A] via-[#F5DFA3] to-[#E8C77A] bg-clip-text text-transparent text-center sm:text-left animate-fadein">
                Intelligence Hub
              </h1>
              <div className="glass-effect rounded-xl p-3 sm:p-4">
                <p className="text-sm md:text-base text-center sm:text-left" style={{ color: "#D3C3C5" }}>
                  Welcome, <span className="font-bold text-white">{user.username}</span>
                </p>
                <div className="mt-1.5 flex items-center justify-center sm:justify-start gap-2">
                  <Wallet className="text-[#E8C77A]" size={18} />
                  <span className="text-xs sm:text-sm" style={{ color: "#D3C3C5" }}>Current Capital:</span>
                  <span className="font-bold text-lg sm:text-xl text-[#F3D393]">
                    ${Number(user.balance ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {error && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl p-3 rounded-lg backdrop-blur-md border text-sm shadow-2xl animate-fadein bg-red-500/90 border-red-400/50 text-white">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 mb-4">
            <section className="glass-effect rounded-xl p-4 animate-fadein">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="text-[#E8C77A]" size={20} />
                <h2 className="text-lg font-semibold text-white">Crisis Status</h2>
              </div>

              {!crisis ? (
                <p className="text-sm" style={{ color: "#D3C3C5" }}>
                  No crisis is active right now. Check back when the organizers start the next round.
                </p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-[#F3D393]">{crisis.title}</p>
                    <p className="text-sm mt-1" style={{ color: "#D3C3C5" }}>
                      {crisisStatusLabel()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full capitalize border ${
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
                    {submitted ? (
                      <span className="flex items-center gap-1 text-green-300">
                        <CheckCircle2 size={12} /> Submitted
                      </span>
                    ) : (
                      <span className="text-yellow-200">Not submitted</span>
                    )}
                  </div>

                  {crisis.status === "active" && crisis.timer && !crisis.timer.openEnded && (
                    <div className="flex items-center gap-2 text-[#F3D393] font-semibold text-sm">
                      <Clock size={14} />
                      <span>Time remaining:</span>
                      <Countdown timer={crisis.timer} />
                    </div>
                  )}

                  <Link
                    href="/crisis"
                    className="inline-flex items-center gap-2 mt-1 px-4 py-2 rounded-xl font-semibold transition-all hover:scale-105"
                    style={{ backgroundColor: "#E8C77A", color: "#241006", boxShadow: "0 0 10px rgba(232,199,122,0.35)" }}
                  >
                    {crisis.status === "active" && !submitted ? "Enter Crisis Decision" : "View Crisis"}
                    <ArrowRight size={16} />
                  </Link>
                </div>
              )}

              {!crisis && (
                <Link
                  href="/crisis"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl font-semibold transition-all hover:scale-105"
                  style={{ backgroundColor: "#E8C77A", color: "#241006", boxShadow: "0 0 10px rgba(232,199,122,0.35)" }}
                >
                  Open Crisis Page
                  <ArrowRight size={16} />
                </Link>
              )}
            </section>

            <section className="glass-effect rounded-xl p-4 animate-fadein">
              <div className="flex items-center gap-2 mb-3">
                <Newspaper className="text-[#E8C77A]" size={20} />
                <h2 className="text-lg font-semibold text-white">Crisis Updates</h2>
              </div>
              {news.length === 0 ? (
                <p className="text-sm" style={{ color: "#D3C3C5" }}>No crisis updates yet.</p>
              ) : (
                <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                  {news.map((n) => (
                    <div key={n.id} className="bg-black/20 border border-[#3D171E] rounded-xl p-3">
                      <h3 className="font-bold text-white text-sm sm:text-base">{n.title}</h3>
                      <p className="text-sm mt-1" style={{ color: "#D3C3C5" }}>{n.body || n.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
