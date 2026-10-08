"use client";
import { useState, useEffect } from "react";
import { Play, Square, Award, RefreshCw, TrendingUp, Users, DollarSign } from "lucide-react";
import AdminNavbar from "../../components/AdminNavbar";
import Countdown from "../../components/Countdown";

export default function AdminLiveBidsPage() {
  const [bids, setBids] = useState([]);
  const [stockName, setStockName] = useState("");
  const [value, setValue] = useState("");
  const [quantity, setQuantity] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchBids();
    const id = setInterval(() => fetchBids(true), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  async function fetchBids(quiet = false) {
    if (!quiet) setLoading(true);
    const res = await fetch("/api/livebids");
    const data = await res.json();
    setBids(data.bids || []);
    if (!quiet) setLoading(false);
  }

  async function createBid() {
    setError("");
    setSuccess("");
    if (!stockName || !value || !quantity) return setError("All fields required");
    setLoading(true);
    const res = await fetch("/api/livebids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stockName,
        value: Number(value),
        quantity: Number(quantity),
        durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Failed to create bid");
      setLoading(false);
      return;
    }
    setSuccess("Bid created!");
    setStockName(""); 
    setValue(""); 
    setQuantity("");
    setDurationSeconds("");
    setLoading(false);
    fetchBids();
  }


  async function updateBid(id, action) {
    setLoading(true);
    const res = await fetch("/api/livebids", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action })
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) setError(data.error || "Failed to update bid");
    fetchBids();
  }

  async function deleteBid(id) {
    setLoading(true);
    const res = await fetch(`/api/livebids?id=${id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to delete bid");
      return;
    }
    setSuccess("Bid deleted");
    fetchBids();
  }

  async function awardBid(id) {
    setLoading(true);
    const res = await fetch("/api/livebids", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "award" })
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    fetchBids();
    if (res.ok && data.success) setSuccess(`Awarded to ${data.winner}`);
    else setError(data.error || "Award failed");
  }

  async function fetchBidUsers(id) {
    const res = await fetch(`/api/livebids/admin?id=${id}`, { credentials: "include" });
    const data = await res.json();
    return data.bids || [];
  }

  const activeBids = bids.filter(b => b.status === "active").length;
  const totalValue = bids.reduce((sum, b) => sum + (b.value * b.quantity), 0);

  return (
    <>
    <AdminNavbar />
    <main className="min-h-screen bg-gradient-to-br from-[#0B0304] via-[#1B080C] to-[#2A0B10] font-sans text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        <header className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-1 bg-gradient-to-r from-[#E8C77A] to-[#F5DFA3] bg-clip-text text-transparent">
            Live Bidding Dashboard
          </h1>
          <p className="text-sm" style={{ color: '#D3C3C5' }}>Create and manage live stock bidding sessions</p>
        </header>

  
        {(error || success) && (
          <div className={`mb-4 p-3 rounded-lg backdrop-blur-sm border text-sm ${
            error 
              ? "bg-red-500/20 border-red-500/50 text-red-200" 
              : "bg-green-500/20 border-green-500/50 text-green-200"
          }`}>
            {error || success}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-[#42121B]/60 to-[#23080D]/80 backdrop-blur-sm rounded-lg border border-[#E8C77A]/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs mb-1" style={{ color: '#D3C3C5' }}>Total Bids</p>
                <p className="text-2xl font-bold">{bids.length}</p>
              </div>
              <TrendingUp className="text-[#E8C77A]" size={28} />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-600/30 to-emerald-600/30 backdrop-blur-sm rounded-lg border border-green-500/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-xs mb-1">Active Bids</p>
                <p className="text-2xl font-bold">{activeBids}</p>
              </div>
              <Play className="text-green-400" size={28} />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-600/30 to-cyan-600/30 backdrop-blur-sm rounded-lg border border-blue-500/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300 text-xs mb-1">Total Value</p>
                <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
              </div>
              <DollarSign className="text-blue-400" size={28} />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          <div className="lg:col-span-1">
            <div className="bg-[#1B080C]/60 backdrop-blur-sm rounded-lg border border-[#3D171E] p-4 sticky top-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Award className="text-[#E8C77A]" size={20} />
                Create New Bid
              </h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#D3C3C5' }}>Stock Name</label>
                  <input
                    type="text"
                    placeholder="e.g., AAPL"
                    value={stockName}
                    onChange={e => setStockName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#D3C3C5' }}>Starting Value ($)</label>
                  <input
                    type="number"
                    placeholder="150"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#D3C3C5' }}>Quantity</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1" style={{ color: '#D3C3C5' }}>Duration (seconds, optional)</label>
                  <input
                    type="number"
                    placeholder="Leave empty for manual stop"
                    value={durationSeconds}
                    onChange={e => setDurationSeconds(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all"
                  />
                </div>
                
                <button
                  onClick={createBid}
                  disabled={loading}
                  className="w-full px-4 py-2 text-sm bg-gradient-to-r from-[#E8C77A] to-[#F5DFA3] hover:brightness-110 text-[#241006] rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#E8C77A]/30"
                >
                  {loading ? "Creating..." : "Create Bid"}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <TrendingUp className="text-[#E8C77A]" size={20} />
                Bidding Sessions
              </h2>
              <button
                onClick={fetchBids}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#2A0B10]/60 hover:bg-[#2A0B10]/80 rounded-lg transition-all border border-[#3D171E] disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {loading && bids.length === 0 ? (
              <div className="text-center py-8 text-[#E8C77A]">
                <RefreshCw className="animate-spin mx-auto mb-3" size={28} />
                <p className="text-sm">Loading bids...</p>
              </div>
            ) : bids.length === 0 ? (
              <div className="text-center py-8 bg-[#1B080C]/40 rounded-lg border border-[#3D171E]">
                <TrendingUp className="mx-auto mb-3 text-[#5C232D]" size={40} />
                <p className="text-[#F3D393] text-sm">No bids created yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bids.map(bid => (
                  <BidCard
                    key={bid.id}
                    bid={bid}
                    updateBid={updateBid}
                    awardBid={awardBid}
                    fetchBidUsers={fetchBidUsers}
                    deleteBid={deleteBid}
                    loading={loading}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
    </>
  );
}


function BidCard({ bid, updateBid, awardBid, fetchBidUsers, deleteBid, loading }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const statusColors = {
    active: "from-green-600/30 to-emerald-600/30 border-green-500/50",
    inactive: "from-yellow-600/30 to-orange-600/30 border-yellow-500/50",
    awarded: "from-blue-600/30 to-[#E8C77A]/20 border-blue-500/50"
  };

  const statusIcons = {
    active: <Play size={14} className="text-green-400" />,
    inactive: <Square size={14} className="text-yellow-400" />,
    awarded: <Award size={14} className="text-blue-400" />
  };

  return (
    <div className={`bg-gradient-to-br ${statusColors[bid.status]} backdrop-blur-sm rounded-lg border p-4 transition-all hover:shadow-lg`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold">{bid.stockName}</h3>
            <span className="flex items-center gap-1 px-2 py-0.5 bg-white/10 rounded-full text-xs font-semibold capitalize">
              {statusIcons[bid.status]}
              {bid.status}
              {bid.status === "active" && bid.timer && !bid.timer.openEnded && (
                <span>
                  <Countdown timer={bid.timer} />
                </span>
              )}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-black/20 rounded-lg p-2">
              <p className="text-xs" style={{ color: '#D3C3C5' }}>Value</p>
              <p className="text-lg font-bold">${bid.value}</p>
            </div>
            <div className="bg-black/20 rounded-lg p-2">
              <p className="text-xs" style={{ color: '#D3C3C5' }}>Quantity</p>
              <p className="text-lg font-bold">{bid.quantity}</p>
            </div>
          </div>
          {bid.status === "awarded" && bid.winner && (
            <div className="mt-2 p-2 bg-green-500/20 border border-green-500/50 rounded-lg">
              <p className="text-green-300 text-xs flex items-center gap-1">
                <Award size={14} />
                Winner: <span className="font-bold">{bid.winner}</span>
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 ml-3">
          {bid.status === "inactive" && (
            <button
              onClick={() => updateBid(bid.id, "start")}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 rounded-lg transition-all disabled:opacity-50 whitespace-nowrap"
            >
              <Play size={14} />
              Start
            </button>
          )}
          {bid.status === "active" && (
            <button
              onClick={() => updateBid(bid.id, "stop")}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-all disabled:opacity-50 whitespace-nowrap"
            >
              <Square size={14} />
              Stop
            </button>
          )}
          {bid.status === "inactive" && (
            <button
              onClick={() => awardBid(bid.id)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#E8C77A] hover:bg-[#F5DFA3] text-[#241006] rounded-lg transition-all disabled:opacity-50 whitespace-nowrap"
            >
              <Award size={14} />
              Award
            </button>
          )}
          {/* Delete Button - always available */}
          <button
            onClick={() => {
              if (!showConfirm) {
                setShowConfirm(true);
                setTimeout(() => setShowConfirm(false), 3000);
              } else {
                setShowConfirm(false);
                deleteBid(bid.id);
              }
            }}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all disabled:opacity-50 whitespace-nowrap mt-1 ${showConfirm ? "bg-red-400 hover:bg-red-500 text-white" : "bg-red-600 hover:bg-red-700 text-white"}`}
          >
            <Square size={14} />
            {showConfirm ? "Confirm?" : "Delete"}
          </button>
        </div>
      </div>
      <div className="pt-3 border-t border-white/10">
        <div className="flex items-center gap-1.5 mb-2" style={{ color: '#D3C3C5' }}>
          <Users size={14} />
          <strong className="text-xs">User Bids</strong>
        </div>
        <BidUsersList bidId={bid.id} fetchBidUsers={fetchBidUsers} />
      </div>
    </div>
  );
}

function BidUsersList({ bidId, fetchBidUsers }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchBidUsers(bidId).then(data => {
      setUsers(data);
      setLoading(false);
    });
  }, [bidId]);

  if (loading) {
    return <div className="text-[#E8C77A] text-xs">Loading bids...</div>;
  }

  if (!users.length) {
    return (
      <div className="text-center py-3 bg-[#1B080C]/40 rounded-lg border border-[#3D171E]">
        <Users className="mx-auto mb-1 text-[#5C232D]" size={20} />
        <p className="text-xs" style={{ color: '#D3C3C5' }}>No bids yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {users.map((b, i) => (
        <div
          key={i}
          className="flex justify-between items-center p-2 bg-[#1B080C]/40 hover:bg-[#1B080C]/60 rounded-lg border border-[#3D171E] transition-all"
        >
          <span className="font-medium text-sm">{b.user}</span>
          <span className="font-bold text-sm text-[#F3D393]">${b.value}</span>
        </div>
      ))}
    </div>
  );
}
