"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Play, Lock, Trash2, RefreshCw, Users, Eye } from "lucide-react";
import AdminNavbar from "../../components/AdminNavbar";
import Countdown from "../../components/Countdown";

const EMPTY_OPTION = () => ({
  title: "",
  description: "",
  category: "",
  financialEffect: "",
  explanation: "",
});

const STATUS_COLORS = {
  draft: "bg-white/10 text-[#D3C3C5] border-white/20",
  active: "bg-green-600/30 text-green-200 border-green-500/50",
  locked: "bg-yellow-600/30 text-yellow-200 border-yellow-500/50",
  revealed: "bg-blue-600/30 text-blue-200 border-blue-500/50",
};

export default function AdminCrisisPage() {
  const [crises, setCrises] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [scenario, setScenario] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(600);
  const [options, setOptions] = useState(Array.from({ length: 8 }, EMPTY_OPTION));

  useEffect(() => {
    fetchCrises();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetchDetail(selectedId);
    const id = setInterval(() => fetchDetail(selectedId, true), 5000);
    return () => clearInterval(id);
  }, [selectedId]);

  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  async function fetchCrises() {
    setLoading(true);
    const res = await fetch("/api/admin/crisis", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(data.error || "Failed to load crises");
    setCrises(data.crises || []);
  }

  async function fetchDetail(id, quiet = false) {
    if (!quiet) setLoading(true);
    const res = await fetch(`/api/admin/crisis?id=${id}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!quiet) setLoading(false);
    if (!res.ok) {
      if (!quiet) setError(data.error || "Failed to load crisis");
      return;
    }
    setDetail(data);
  }

  function updateOption(idx, field, value) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));
  }

  async function handleCreate() {
    setError("");
    setSuccess("");
    if (!title || !scenario) return setError("Title and scenario are required");
    if (options.some((o) => !o.title)) return setError("Every one of the 8 options needs a title");

    setLoading(true);
    const res = await fetch("/api/admin/crisis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title, scenario, durationSeconds: Number(durationSeconds) || 600, options }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(data.error || "Failed to create crisis");
    setSuccess("Crisis created as draft");
    setTitle("");
    setScenario("");
    setOptions(Array.from({ length: 8 }, EMPTY_OPTION));
    setShowCreate(false);
    fetchCrises();
    setSelectedId(data.crisis.id);
  }

  async function runAction(id, action) {
    setError("");
    setSuccess("");
    setLoading(true);
    const res = await fetch("/api/admin/crisis", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, action, durationSeconds: Number(durationSeconds) || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(data.error || `Failed to ${action} crisis`);
    setSuccess(`Crisis ${action}ed`);
    fetchCrises();
    fetchDetail(id);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this draft crisis? This cannot be undone.")) return;
    setError("");
    const res = await fetch(`/api/admin/crisis?id=${id}`, { method: "DELETE", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || "Failed to delete crisis");
    setSuccess("Draft deleted");
    if (selectedId === id) {
      setSelectedId(null);
      setDetail(null);
    }
    fetchCrises();
  }

  return (
    <>
      <AdminNavbar />
      <main className="min-h-screen bg-gradient-to-br from-[#0B0304] via-[#1B080C] to-[#2A0B10] font-sans text-white p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-1 bg-gradient-to-r from-[#E8C77A] to-[#F5DFA3] bg-clip-text text-transparent flex items-center gap-2">
                <AlertTriangle className="text-[#E8C77A]" /> Crisis Control
              </h1>
              <p className="text-sm" style={{ color: "#D3C3C5" }}>
                Create crises, monitor decisions, and lock the decision window.
              </p>
            </div>
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="px-4 py-2 bg-gradient-to-r from-[#E8C77A] to-[#F5DFA3] text-[#241006] rounded-lg font-semibold shadow-lg"
            >
              {showCreate ? "Close" : "New Crisis"}
            </button>
          </header>

          {(error || success) && (
            <div
              className={`mb-4 p-3 rounded-lg border text-sm ${
                error ? "bg-red-500/20 border-red-500/50 text-red-200" : "bg-green-500/20 border-green-500/50 text-green-200"
              }`}
            >
              {error || success}
            </div>
          )}

          {showCreate && (
            <div className="bg-[#1B080C]/60 backdrop-blur-sm rounded-lg border border-[#3D171E] p-4 md:p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Create Crisis</h2>
              <div className="grid md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "#D3C3C5" }}>Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[#2A0B10]/60 border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none"
                    placeholder="e.g. Battery Supply Shortage"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "#D3C3C5" }}>Decision window (seconds)</label>
                  <input
                    type="number"
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[#2A0B10]/60 border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none"
                    placeholder="600 = 10 minutes"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs mb-1" style={{ color: "#D3C3C5" }}>Scenario</label>
                <textarea
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#2A0B10]/60 border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none min-h-[80px]"
                  placeholder="Describe the crisis facing the company..."
                />
              </div>

              <h3 className="text-lg font-semibold mb-2">8 Decision Options</h3>
              <p className="text-xs mb-3" style={{ color: "#D3C3C5" }}>
                Financial outcome and explanation are stored server-side and are never sent to teams before reveal.
              </p>
              <div className="space-y-3 mb-4 max-h-[520px] overflow-y-auto pr-1">
                {options.map((opt, idx) => (
                  <div key={idx} className="bg-black/25 rounded-lg border border-[#3D171E] p-3">
                    <div className="text-xs font-bold text-[#F3D393] mb-2">Option {idx + 1}</div>
                    <div className="grid md:grid-cols-2 gap-2 mb-2">
                      <input
                        value={opt.title}
                        onChange={(e) => updateOption(idx, "title", e.target.value)}
                        placeholder="Option title"
                        className="px-2 py-1.5 text-sm rounded bg-[#2A0B10]/60 border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none"
                      />
                      <input
                        value={opt.category}
                        onChange={(e) => updateOption(idx, "category", e.target.value)}
                        placeholder="Category (science/tech/business/finance/...)"
                        className="px-2 py-1.5 text-sm rounded bg-[#2A0B10]/60 border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none"
                      />
                    </div>
                    <textarea
                      value={opt.description}
                      onChange={(e) => updateOption(idx, "description", e.target.value)}
                      placeholder="Description shown to teams"
                      className="w-full px-2 py-1.5 text-sm rounded bg-[#2A0B10]/60 border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none mb-2 min-h-[44px]"
                    />
                    <div className="grid md:grid-cols-2 gap-2 mb-2">
                      <input
                        type="number"
                        value={opt.financialEffect}
                        onChange={(e) => updateOption(idx, "financialEffect", e.target.value)}
                        placeholder="Hidden financial outcome (e.g. -5000 or 8000)"
                        className="px-2 py-1.5 text-sm rounded bg-[#2A0B10]/60 border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none"
                      />
                      <input
                        value={opt.explanation}
                        onChange={(e) => updateOption(idx, "explanation", e.target.value)}
                        placeholder="Explanation for later reveal"
                        className="px-2 py-1.5 text-sm rounded bg-[#2A0B10]/60 border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-[#E8C77A] to-[#F5DFA3] text-[#241006] rounded-lg font-semibold disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Crisis (draft)"}
              </button>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">All Crises</h2>
                <button onClick={fetchCrises} className="text-[#F3D393] hover:text-white text-sm flex items-center gap-1">
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
              <div className="space-y-2">
                {crises.length === 0 && (
                  <div className="text-center py-8 text-sm" style={{ color: "#D3C3C5" }}>No crises yet</div>
                )}
                {crises.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedId === c.id ? "bg-[#E8C77A]/15 border-[#E8C77A]/50" : "bg-[#1B080C]/50 border-[#3D171E] hover:border-[#E8C77A]/30"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm">{c.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[c.revealed || c.status === "revealed" ? "revealed" : c.status]}`}>
                        {c.revealed || c.status === "revealed" ? "revealed" : c.status}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: "#D3C3C5" }}>
                      {new Date(c.created_at).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              {!detail?.crisis ? (
                <div className="text-center py-16 bg-[#1B080C]/40 rounded-lg border border-[#3D171E]" style={{ color: "#D3C3C5" }}>
                  Select a crisis to view details
                </div>
              ) : (
                <CrisisDetail detail={detail} onAction={runAction} onDelete={handleDelete} loading={loading} />
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function CrisisDetail({ detail, onAction, onDelete, loading }) {
  const { crisis, submissions = [], results = [], totalTeams = 0 } = detail;

  return (
    <div className="bg-[#1B080C]/60 backdrop-blur-sm rounded-lg border border-[#3D171E] p-4 md:p-6">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold">{crisis.title}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[crisis.status]}`}>
              {crisis.status}
            </span>
          </div>
          {crisis.status === "active" && crisis.timer && !crisis.timer.openEnded && (
            <div className="text-[#F3D393] text-sm font-semibold flex items-center gap-1">
              Time left: <Countdown timer={crisis.timer} />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {crisis.status === "draft" && (
            <>
              <button onClick={() => onAction(crisis.id, "start")} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
                <Play size={14} /> Start
              </button>
              <button onClick={() => onDelete(crisis.id)} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50">
                <Trash2 size={14} /> Delete
              </button>
            </>
          )}
          {crisis.status === "active" && (
            <button onClick={() => onAction(crisis.id, "lock")} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-yellow-600 hover:bg-yellow-700 rounded-lg disabled:opacity-50">
              <Lock size={14} /> Lock now
            </button>
          )}
          {crisis.status === "locked" && (
            <button onClick={() => onAction(crisis.id, "reveal")} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
              <Eye size={14} /> Reveal
            </button>
          )}
        </div>
      </div>

      <p className="text-sm mb-2" style={{ color: "#D3C3C5" }}>{crisis.scenario}</p>

      <div className="flex items-center gap-2 mb-3 text-sm">
        <Users size={16} className="text-[#E8C77A]" />
        <span>
          {submissions.length} / {totalTeams} teams submitted
        </span>
      </div>

      <div className="space-y-2 mb-4">
        {crisis.options.map((opt) => (
          <div key={opt.id} className="bg-black/20 rounded-lg border border-[#3D171E] p-3">
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="text-xs font-bold text-[#F3D393]">#{opt.option_index}</span>{" "}
                <span className="font-semibold">{opt.title}</span>
                {opt.category && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-white/10">{opt.category}</span>}
                {opt.description && <p className="text-xs mt-1" style={{ color: "#D3C3C5" }}>{opt.description}</p>}
              </div>
              <div className="text-right text-xs shrink-0">
                <div className="font-bold">{opt.financial_effect != null ? `$${Number(opt.financial_effect).toLocaleString()}` : "—"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {submissions.length > 0 && crisis.status !== "revealed" && (
        <div className="mt-2">
          <h3 className="text-sm font-semibold mb-2">Submissions</h3>
          <div className="space-y-1 text-sm">
            {submissions.map((s) => (
              <div key={s.username} className="flex justify-between bg-black/20 rounded px-3 py-1.5 border border-[#3D171E]">
                <span>{s.username}</span>
                <span style={{ color: "#D3C3C5" }}>locked</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {crisis.status === "revealed" && results.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Results</h3>
          <div className="space-y-1 text-sm">
            {results.map((r) => (
              <div key={r.username} className="flex justify-between gap-3 bg-black/20 rounded px-3 py-1.5 border border-[#3D171E]">
                <span>{r.username}{r.submitted ? "" : " (no submit)"}</span>
                <span className={Number(r.financial_effect) >= 0 ? "text-green-400" : "text-red-400"}>
                  {Number(r.financial_effect) >= 0 ? "+" : ""}${Number(r.financial_effect).toLocaleString()}
                  {" "}→ ${Number(r.capital_after).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
