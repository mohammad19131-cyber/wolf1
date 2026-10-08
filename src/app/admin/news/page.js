"use client";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import AdminNavbar from "../../components/AdminNavbar";
import Button from "../../components/Button";

export default function NewsAdminPage() {
  const [news, setNews] = useState([]);
  const [newNews, setNewNews] = useState({ title: "", body: "" });
  const [selectedNews, setSelectedNews] = useState("");
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateBody, setUpdateBody] = useState("");
  const [activeTab, setActiveTab] = useState("add");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNews();
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

  async function fetchNews() {
    setLoading(true);
    const res = await fetch("/api/news", { credentials: "include" });
    const data = await res.json();
    setNews(data.news || []);
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
    if (!newNews.title || !newNews.body) {
      return setError("Please fill in all fields");
    }
    setLoading(true);
    const res = await fetch("/api/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newNews),
      credentials: "include",
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Failed to add news");
    setSuccess("News added successfully!");
    setNewNews({ title: "", body: "" });
    fetchNews();
  }

  async function handleUpdate() {
    setError("");
    setSuccess("");
    if (!selectedNews) return setError("Please select a news article");
    setLoading(true);
    const res = await fetch("/api/news", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedNews, title: updateTitle, body: updateBody }),
      credentials: "include",
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Failed to update news");
    setSuccess("News updated successfully!");
    setUpdateTitle("");
    setUpdateBody("");
    fetchNews();
  }

  async function handleDelete() {
    setError("");
    setSuccess("");
    if (!selectedNews) return setError("Please select a news article");
    const article = news.find(n => n.id === selectedNews);
    if (!confirm(`Are you sure you want to delete "${article.title}"?`)) return;
    setLoading(true);
    const res = await fetch("/api/news", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedNews }),
      credentials: "include",
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Failed to delete news");
    setSuccess("News deleted successfully!");
    setSelectedNews("");
    fetchNews();
  }

  return (
    <>
      <AdminNavbar />
      <main className="min-h-screen bg-gradient-to-br from-[#0B0304] via-[#1B080C] to-[#2A0B10] font-sans text-white p-4 md:p-8">
        <div className="max-w-6xl mx-auto">

          <header className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-[#E8C77A] to-[#F5DFA3] bg-clip-text text-transparent">
                News Admin
              </h1>
              <p className="text-sm md:text-base" style={{ color: '#D3C3C5' }}>Manage news articles and updates</p>
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
                  Add News
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
                    <h2 className="text-2xl font-semibold mb-4">Add News Article</h2>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-sm mb-1" style={{ color: '#D3C3C5' }}>Title</label>
                        <input
                          type="text"
                          placeholder="Enter news title"
                          value={newNews.title}
                          onChange={(e) => setNewNews({ ...newNews, title: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1" style={{ color: '#D3C3C5' }}>Content</label>
                        <textarea
                          placeholder="Enter news content"
                          value={newNews.body}
                          onChange={(e) => setNewNews({ ...newNews, body: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all min-h-[150px] resize-y"
                        />
                      </div>
                      <div onClick={handleCreate}>
                        <Button text={loading ? "Adding..." : "Add News"} color="#E8C77A" textColor="#241006" glowColor="#F5DFA3" rippleColor="rgba(36,16,6,0.2)" />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "update" && (
                  <div>
                    <h2 className="text-2xl font-semibold mb-4">Update News Article</h2>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-sm mb-1" style={{ color: '#D3C3C5' }}>Select Article</label>
                        <select
                          value={selectedNews}
                          onChange={(e) => {
                            setSelectedNews(e.target.value);
                            const article = news.find(n => n.id === e.target.value);
                            setUpdateTitle(article ? article.title : "");
                            setUpdateBody(article ? article.body : "");
                          }}
                          className="w-full px-4 py-3 rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all"
                        >
                          <option value="">Choose an article</option>
                          {news.map(n => (
                            <option key={n.id} value={n.id}>
                              {n.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      {selectedNews && (
                        <>
                          <div>
                            <label className="block text-sm mb-1" style={{ color: '#D3C3C5' }}>Title</label>
                            <input
                              type="text"
                              placeholder="Enter new title"
                              value={updateTitle}
                              onChange={(e) => setUpdateTitle(e.target.value)}
                              className="w-full px-4 py-3 rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm mb-1" style={{ color: '#D3C3C5' }}>Content</label>
                            <textarea
                              placeholder="Enter new content"
                              value={updateBody}
                              onChange={(e) => setUpdateBody(e.target.value)}
                              className="w-full px-4 py-3 rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all min-h-[150px] resize-y"
                            />
                          </div>
                        </>
                      )}
                      <div onClick={handleUpdate}>
                        <Button text={loading ? "Updating..." : "Update News"} color="#E8C77A" textColor="#241006" glowColor="#F5DFA3" rippleColor="rgba(36,16,6,0.2)" />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "delete" && (
                  <div>
                    <h2 className="text-2xl font-semibold mb-4">Delete News Article</h2>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-sm mb-1" style={{ color: '#D3C3C5' }}>Select Article</label>
                        <select
                          value={selectedNews}
                          onChange={(e) => setSelectedNews(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all"
                        >
                          <option value="">Choose an article to delete</option>
                          {news.map(n => (
                            <option key={n.id} value={n.id}>
                              {n.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-sm text-red-200">
                        Warning: This action cannot be undone
                      </div>
                      <div onClick={handleDelete}>
                        <Button text={loading ? "Deleting..." : "Delete News"} color="#E8C77A" textColor="#241006" glowColor="#F5DFA3" rippleColor="rgba(36,16,6,0.2)" />
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
                    <span style={{ color: '#D3C3C5' }}>Total Articles</span>
                    <span className="text-2xl font-bold">{news.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: '#D3C3C5' }}>Published</span>
                    <span className="text-2xl font-bold text-green-400">{news.length}</span>
                  </div>
                </div>
              </div>

              {/* News List */}
              <div className="bg-[#1B080C]/60 backdrop-blur-sm rounded-lg border border-[#3D171E] p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">All Articles</h3>
                  <button
                    onClick={fetchNews}
                    className="text-[#F3D393] hover:text-white transition-colors text-sm"
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Refresh"}
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {news.length === 0 ? (
                    <div className="text-center py-8" style={{ color: '#D3C3C5' }}>
                      No articles yet
                    </div>
                  ) : (
                    news.map(n => (
                      <div
                        key={n.id}
                        className="p-3 rounded-lg bg-[#2A0B10]/40 hover:bg-[#2A0B10]/60 transition-all border border-[#3D171E]/60"
                      >
                        <div className="font-medium text-[#F5DFA3] mb-1">{n.title}</div>
                        <div className="text-sm line-clamp-2" style={{ color: '#D3C3C5' }}>{n.body}</div>
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
