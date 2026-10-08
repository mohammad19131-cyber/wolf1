"use client";
import { useState, useEffect } from "react";
import { Eye, EyeOff, LogOut } from "lucide-react";
import Button from "../components/Button";
import AdminNavbar from "../components/AdminNavbar";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: "", password: "", balance: 10000 });
  const [selectedUser, setSelectedUser] = useState("");
  const [updateBalance, setUpdateBalance] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("add");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
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

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/admin");
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }

  async function handleLogout() {
    setLoading(true);
    const res = await fetch("/api/logout", {
      method: "POST",
    });
    if (res.ok) {
      window.location.href = "/";
    } else {
      setError("Failed to logout");
      setLoading(false);
    }
  }

  async function handleAddUser() {
    setError("");
    setSuccess("");
    setLoading(true);
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    const data = await res.json();
    setLoading(false);
    if (res.status === 409) return setError("username already exists");
    if (!res.ok) return setError(data.error || "Failed to add user");
    setSuccess("User added successfully!");
    setNewUser({ username: "", password: "", balance: 10000 });
    fetchUsers();
  }

  async function handleUpdateBalance() {
    setError("");
    setSuccess("");
    if (!selectedUser) return setError("Please select a user");
    setLoading(true);
    const res = await fetch("/api/admin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: selectedUser, balance: Number(updateBalance) }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Failed to update balance");
    setSuccess("Balance updated successfully!");
    setUpdateBalance("");
    fetchUsers();
  }

  async function handleDeleteUser() {
    setError("");
    setSuccess("");
    if (!selectedUser) return setError("Please select a user");
    if (!confirm(`Are you sure you want to delete user "${selectedUser}"?`)) return;
    setLoading(true);
    const res = await fetch("/api/admin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: selectedUser }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Failed to delete user");
    setSuccess("User deleted successfully!");
    setSelectedUser("");
    fetchUsers();
  }

  const totalBalance = users.reduce((sum, u) => sum + u.balance, 0);

  return (
    <>
      <AdminNavbar />
      <main className="min-h-screen bg-gradient-to-br from-[#0B0304] via-[#1B080C] to-[#2A0B10] font-sans text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-[#E8C77A] to-[#F5DFA3] bg-clip-text text-transparent">
              Users Admin
            </h1>
            <p className="text-sm md:text-base" style={{ color: '#D3C3C5' }}>Manage users and balances</p>
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
                Add User
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
                  <h2 className="text-2xl font-semibold mb-4">Add New User</h2>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-sm mb-1" style={{ color: '#D3C3C5' }}>username</label>
                      <input
                        type="text"
                        placeholder="Enter username"
                        value={newUser.username}
                        onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1" style={{ color: '#D3C3C5' }}>Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password"
                          value={newUser.password}
                          onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                          className="w-full px-4 py-3 pr-12 rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#E8C77A] hover:text-[#F5DFA3] transition-colors"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm mb-1" style={{ color: '#D3C3C5' }}>Initial Balance</label>
                      <input
                        type="number"
                        placeholder="10000"
                        value={newUser.balance}
                        onChange={e => setNewUser(u => ({ ...u, balance: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all"
                      />
                    </div>
                    <div onClick={handleAddUser}>
                      <Button text={loading ? "Adding..." : "Add User"} color="#E8C77A" textColor="#241006" glowColor="#F5DFA3" rippleColor="rgba(36,16,6,0.2)" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "update" && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Update Balance</h2>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-sm mb-1" style={{ color: '#D3C3C5' }}>Select User</label>
                      <select
                        value={selectedUser}
                        onChange={e => setSelectedUser(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all"
                      >
                        <option value="">Choose a user</option>
                        {users.map(u => (
                          <option key={u.username} value={u.username}>
                            {u.username} (Current: ${u.balance})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-1" style={{ color: '#D3C3C5' }}>New Balance</label>
                      <input
                        type="number"
                        placeholder="Enter new balance"
                        value={updateBalance}
                        onChange={e => setUpdateBalance(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all"
                      />
                    </div>
                    <div onClick={handleUpdateBalance}>
                      <Button text={loading ? "Updating..." : "Update Balance"} color="#E8C77A" textColor="#241006" glowColor="#F5DFA3" rippleColor="rgba(36,16,6,0.2)" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "delete" && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Delete User</h2>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-sm mb-1" style={{ color: '#D3C3C5' }}>Select User</label>
                      <select
                        value={selectedUser}
                        onChange={e => setSelectedUser(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-[#2A0B10]/60 text-white border border-[#3D171E] focus:border-[#E8C77A] focus:outline-none focus:ring-2 focus:ring-[#E8C77A]/40 transition-all"
                      >
                        <option value="">Choose a user to delete</option>
                        {users.map(u => (
                          <option key={u.username} value={u.username}>
                            {u.username}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-sm text-red-200">
                      Warning: This action cannot be undone
                    </div>
                    <div onClick={handleDeleteUser}>
                      <Button text={loading ? "Deleting..." : "Delete User"} color="#E8C77A" textColor="#241006" glowColor="#F5DFA3" rippleColor="rgba(36,16,6,0.2)" />
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
                  <span style={{ color: '#D3C3C5' }}>Total Users</span>
                  <span className="text-2xl font-bold">{users.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: '#D3C3C5' }}>Total Balance</span>
                  <span className="text-2xl font-bold">${totalBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: '#D3C3C5' }}>Avg Balance</span>
                  <span className="text-2xl font-bold">
                    ${users.length ? Math.round(totalBalance / users.length).toLocaleString() : 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#1B080C]/60 backdrop-blur-sm rounded-lg border border-[#3D171E] p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">All Users</h3>
                <button
                  onClick={fetchUsers}
                  className="text-[#F3D393] hover:text-white transition-colors text-sm"
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Refresh"}
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {users.length === 0 ? (
                  <div className="text-center py-8" style={{ color: '#D3C3C5' }}>
                    No users yet
                  </div>
                ) : (
                  users.map(u => (
                    <div
                      key={u.username}
                      className="flex justify-between items-center p-3 rounded-lg bg-[#2A0B10]/40 hover:bg-[#2A0B10]/60 transition-all border border-[#3D171E]/60"
                    >
                      <span className="font-medium">{u.username}</span>
                      <span className="font-semibold text-[#F3D393]">
                        ${u.balance.toLocaleString()}
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
