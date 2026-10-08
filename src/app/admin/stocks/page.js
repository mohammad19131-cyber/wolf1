"use client";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import AdminNavbar from "../../components/AdminNavbar";
import Button from "../../components/Button";

export default function StocksAdminPage() {
  const [stocks, setStocks] = useState([]);
  const [newStock, setNewStock] = useState({ StockName: "", StockValue: "" });
  const [selected, setSelected] = useState([]);
  const [editValues, setEditValues] = useState({});
  const [activeTab, setActiveTab] = useState("add");
  const [selectedStock, setSelectedStock] = useState("");
  const [updateValue, setUpdateValue] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStocks();
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

  async function fetchStocks() {
    setLoading(true);
    const res = await fetch("/api/stocks", { credentials: "include" });
    const data = await res.json();
    setStocks(data.stocks || []);
    setLoading(false);
  }

  async function handleLogout() {
    setLoading(true);
    const res = await fetch("/api/logout", { method: "POST" });
    if (res.ok) {
      window.location.href = "/";
    } else {
      setError("Failed to logout");
      setLoading(false);
    }
  }

  async function handleCreate() {
    setError("");
    setSuccess("");
    if (!newStock.StockName || !newStock.StockValue) {
      return setError("Please fill in all fields");
    }
    setLoading(true);
    const res = await fetch("/api/stocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStock),
      credentials: "include",
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Failed to add stock");
    setSuccess("Stock added successfully!");
    setNewStock({ StockName: "", StockValue: "" });
    fetchStocks();
  }

  async function handleUpdate() {
    setError("");
    setSuccess("");
    if (!selectedStock) return setError("Please select a stock");
    setLoading(true);
    const stock = stocks.find(s => s.id === selectedStock);
    const res = await fetch("/api/stocks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedStock, StockValue: updateValue }),
      credentials: "include",
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Failed to update stock");
    setSuccess("Stock updated successfully!");
    setUpdateValue("");
    fetchStocks();
  }

  async function handleDelete() {
    setError("");
    setSuccess("");
    if (!selectedStock) return setError("Please select a stock");
    const stock = stocks.find(s => s.id === selectedStock);
    if (!confirm(`Are you sure you want to delete stock "${stock.StockName}"?`)) return;
    setLoading(true);
    const res = await fetch("/api/stocks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedStock }),
      credentials: "include",
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Failed to delete stock");
    setSuccess("Stock deleted successfully!");
    setSelectedStock("");
    fetchStocks();
  }

  const totalValue = stocks.reduce((sum, s) => sum + Number(s.StockValue), 0);

  return (
    <>
      <AdminNavbar />
      <main className="min-h-screen bg-gradient-to-br from-[#0B0304] via-[#1B080C] to-[#2A0B10] font-sans text-white p-4 md:p-8">
        <div className="max-w-6xl mx-auto">

          <header className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-[#E8C77A] to-[#F5DFA3] bg-clip-text text-transparent">
                Stocks Admin
              </h1>
              <p className="text-sm md:text-base" style={{ color: '#D3C3C5' }}>Manage stocks and their values</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </header>


          {(error || success) && (
            <div className={`mb-6 p-4 rounded-lg backdrop-blur-sm border ${
              error 
                ? "bg-red-500/20 border-red-500/50 text-red-200" 
                : "bg-green-500/20 border-green-500/50 text-green-200"
            }`}>
              {error || success}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6">

            <div className="md:col-span-2 space-y-6">

              <div className="flex gap-2 bg-[#1B080C]/60 p-2 rounded-lg backdrop-blur-sm border border-[#3D171E]">
                <button
                  onClick={() => setActiveTab("add")}
                  className={`flex-1 py-2 px-4 rounded-md transition-all ${
                    activeTab === "add"
                      ? "bg-[#E8C77A] text-[#241006] shadow-lg shadow-[#E8C77A]/30"
                      : "hover:bg-[#2A0B10]/60"
                  }`}
                  style={activeTab !== "add" ? { color: '#D3C3C5' } : undefined}
                >
                  Add Stock
                </button>
                <button
                  onClick={() => setActiveTab("update")}
                  className={`flex-1 py-2 px-4 rounded-md transition-all ${
                    activeTab === "update"
                      ? "bg-[#E8C77A] text-[#241006] shadow-lg shadow-[#E8C77A]/30"
                      : "hover:bg-[#2A0B10]/60"
                  }`}
                  style={activeTab !== "update" ? { color: '#D3C3C5' } : undefined}
                >
                  Update
                </button>
                <button
                  onClick={() => setActiveTab("delete")}
                  className={`flex-1 py-2 px-4 rounded-md transition-all ${
                    activeTab === "delete"
                      ? "bg-[#E8C77A] text-[#241006] shadow-lg shadow-[#E8C77A]/30"
                      : "hover:bg-[#2A0B10]/60"
                  }`}
                  style={activeTab !== "delete" ? { color: '#D3C3C5' } : undefined}
                >
                  Delete
                </button>
              </div>


              <div className="bg-[#1B080C]/60 backdrop-blur-sm rounded-lg border border-[#3D171E] p-6">
                {activeTab === "add" && (
                  <div>
                    <h2 className="text-2xl font-semibold mb-4">Add New Stock</h2>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-sm mb-1" style={{ color: '#D3C3C5' }}>Stock Name</label>
                        <input
                          type="text"
                          placeholder="Enter stock name"
                          value={newStock.StockName}
                          onChange={(e) => setNewStock({ ...newStock, StockName: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1" style={{ color: '#D3C3C5' }}>Stock Value</label>
                        <input
                          type="number"
                          placeholder="Enter stock value"
                          value={newStock.StockValue}
                          onChange={(e) => setNewStock({ ...newStock, StockValue: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all"
                        />
                      </div>
                      <div onClick={handleCreate}>
                        <Button text={loading ? "Adding..." : "Add Stock"} color="#E8C77A" textColor="#241006" glowColor="#F5DFA3" rippleColor="rgba(36,16,6,0.2)" />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "update" && (
                  <div>
                    <h2 className="text-2xl font-semibold mb-4">Update Stock Value</h2>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-sm mb-1" style={{ color: '#D3C3C5' }}>Select Stock</label>
                        <select
                          value={selectedStock}
                          onChange={(e) => {
                            setSelectedStock(e.target.value);
                            const stock = stocks.find(s => s.id === e.target.value);
                            setUpdateValue(stock ? stock.StockValue : "");
                          }}
                          className="w-full px-4 py-3 rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all"
                        >
                          <option value="">Choose a stock</option>
                          {stocks.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.StockName} (Current: ${s.StockValue})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm mb-1" style={{ color: '#D3C3C5' }}>New Value</label>
                        <input
                          type="number"
                          placeholder="Enter new value"
                          value={updateValue}
                          onChange={(e) => setUpdateValue(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all"
                        />
                      </div>
                      <div onClick={handleUpdate}>
                        <Button text={loading ? "Updating..." : "Update Stock"} color="#E8C77A" textColor="#241006" glowColor="#F5DFA3" rippleColor="rgba(36,16,6,0.2)" />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "delete" && (
                  <div>
                    <h2 className="text-2xl font-semibold mb-4">Delete Stock</h2>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-sm mb-1" style={{ color: '#D3C3C5' }}>Select Stock</label>
                        <select
                          value={selectedStock}
                          onChange={(e) => setSelectedStock(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all"
                        >
                          <option value="">Choose a stock to delete</option>
                          {stocks.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.StockName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-sm text-red-200">
                        Warning: This action cannot be undone
                      </div>
                      <div onClick={handleDelete}>
                        <Button text={loading ? "Deleting..." : "Delete Stock"} color="#E8C77A" textColor="#241006" glowColor="#F5DFA3" rippleColor="rgba(36,16,6,0.2)" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">

              <div className="bg-gradient-to-br from-[#42121B]/70 to-[#23080D]/90 backdrop-blur-sm rounded-lg border border-[#E8C77A]/20 p-6">
                <h3 className="text-lg font-semibold mb-4">Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span style={{ color: '#D3C3C5' }}>Total Stocks</span>
                    <span className="text-2xl font-bold">{stocks.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: '#D3C3C5' }}>Total Value</span>
                    <span className="text-2xl font-bold">${totalValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: '#D3C3C5' }}>Avg Value</span>
                    <span className="text-2xl font-bold">
                      ${stocks.length ? Math.round(totalValue / stocks.length).toLocaleString() : 0}
                    </span>
                  </div>
                </div>
              </div>


              <div className="bg-[#1B080C]/60 backdrop-blur-sm rounded-lg border border-[#3D171E] p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">All Stocks</h3>
                  <button
                    onClick={fetchStocks}
                    className="text-[#F3D393] hover:text-white transition-colors text-sm"
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Refresh"}
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {stocks.length === 0 ? (
                    <div className="text-center py-8" style={{ color: '#D3C3C5' }}>
                      No stocks yet
                    </div>
                  ) : (
                    stocks.map(s => (
                      <div
                        key={s.id}
                        className="flex justify-between items-center p-3 rounded-lg bg-[#2A0B10]/40 hover:bg-[#2A0B10]/60 transition-all border border-[#3D171E]/60"
                      >
                        <span className="font-medium">{s.StockName}</span>
                        <span className="font-semibold text-[#F3D393]">
                          ${Number(s.StockValue).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
