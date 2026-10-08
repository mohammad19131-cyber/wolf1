"use client";
import { useEffect, useState } from "react";
import { Trophy, TrendingUp, Wallet, BarChart3, Crown, Medal, Award } from "lucide-react";
import AdminNavbar from "../../components/AdminNavbar";
import Link from "next/link";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]); //array for storing top users, leaderboard[0] is the top trader
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard() {
    try {
      setLoading(true);
      setError("");

      // Fetch all users
      const usersRes = await fetch("/api/admin", {
        credentials: "include",
      });
      if (!usersRes.ok) throw new Error("Failed to fetch users");
      const usersData = await usersRes.json();

      // Fetch all stocks
      const stocksRes = await fetch("/api/stocks");
      if (!stocksRes.ok) throw new Error("Failed to fetch stocks");
      const stocksData = await stocksRes.json();

      // Calculate portfolio value for each user (admin is cookie-auth, not a users row)
      const leaderboardData = usersData.users
        .map(user => {
          const portfolioValue = (user.stocks || []).reduce((sum, holding) => {
            const stock = stocksData.stocks.find(s => s.id === holding.stockId);
            if (stock) {
              return sum + (stock.StockValue * holding.quantity);
            } else if (holding.stockId && holding.stockId.startsWith("bid:")) {
              // Live bid holding - use average price
              return sum + (holding.avgPrice * holding.quantity);
            }
            return sum;
          }, 0);

          const totalValue = user.balance + portfolioValue;

          return {
            username: user.username,
            balance: user.balance,
            portfolioValue: portfolioValue,
            totalValue: totalValue,
            stocksCount: (user.stocks || []).length
          };
        });

      // Sort by total value (descending)
      leaderboardData.sort((a, b) => b.totalValue - a.totalValue);

      setLeaderboard(leaderboardData);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  function getRankIcon(rank) {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-[#F3D393]" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-400">#{rank}</span>;
    }
  }

  function getRankColor(rank) {
    switch (rank) {
      case 1:
        return "from-[#F3D393]/20 to-[#CBA158]/10 border-[#F3D393]/50";
      case 2:
        return "from-gray-300/20 to-gray-400/10 border-gray-300/50";
      case 3:
        return "from-amber-600/20 to-amber-700/10 border-amber-600/50";
      default:
        return "from-[#42121B]/20 to-blue-500/10 border-[#3D171E]";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B0304] via-[#1B080C] to-[#2A0B10] flex items-center justify-center">
        <div className="text-white text-xl">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0304] via-[#1B080C] to-[#2A0B10]">
      <AdminNavbar />
      
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy className="w-10 h-10 text-[#F3D393]" />
            <h1 className="text-4xl font-bold text-white">Leaderboard</h1>
          </div>
          <p style={{ color: '#D3C3C5' }}>Top traders ranked by total value (Balance + Portfolio)</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-[#42121B]/40 to-[#23080D]/60 backdrop-blur-sm border border-[#E8C77A]/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-[#F3D393]" />
              <div>
                <p className="text-sm" style={{ color: '#D3C3C5' }}>Total Traders</p>
                <p className="text-white text-2xl font-bold">{leaderboard.length}</p>
              </div>
            </div>
          </div>
          
          {leaderboard[0] && (
            <>
              <div className="bg-gradient-to-br from-[#42121B]/40 to-[#23080D]/60 backdrop-blur-sm border border-[#E8C77A]/20 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Crown className="w-8 h-8 text-[#F3D393]" />
                  <div>
                    <p className="text-sm" style={{ color: '#D3C3C5' }}>Top Trader</p>
                    <p className="text-white text-xl font-bold">{leaderboard[0].username}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-[#42121B]/40 to-[#23080D]/60 backdrop-blur-sm border border-[#E8C77A]/20 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-sm" style={{ color: '#D3C3C5' }}>Highest Value</p>
                    <p className="text-white text-2xl font-bold">${leaderboard[0].totalValue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-gradient-to-br from-[#42121B]/25 to-[#23080D]/35 backdrop-blur-sm border border-[#3D171E] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#1B080C]/60 border-b border-[#3D171E]">
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: '#D3C3C5' }}>Rank</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: '#D3C3C5' }}>Trader</th>
                  <th className="px-4 py-3 text-right font-semibold" style={{ color: '#D3C3C5' }}>Balance</th>
                  <th className="px-4 py-3 text-right font-semibold" style={{ color: '#D3C3C5' }}>Portfolio</th>
                  <th className="px-4 py-3 text-right font-semibold" style={{ color: '#D3C3C5' }}>Total Value</th>
                  <th className="px-4 py-3 text-center font-semibold" style={{ color: '#D3C3C5' }}>Holdings</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center" style={{ color: '#D3C3C5' }}>
                      No traders yet
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((user, index) => {
                    const rank = index + 1;
                    return (
                      <tr
                        key={user.username}
                        className={`border-b border-[#3D171E]/60 hover:bg-[#E8C77A]/5 transition-colors ${
                          rank <= 3 ? "bg-gradient-to-r " + getRankColor(rank) : ""
                        }`}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {getRankIcon(rank)}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Link 
                              href={`/admin/leaderboard/${user.username}`}
                              className={`font-semibold hover:underline cursor-pointer ${rank === 1 ? "text-[#F3D393] text-lg" : rank === 2 ? "text-gray-300 text-lg" : rank === 3 ? "text-amber-600 text-lg" : "text-white"}`}
                            >
                              {user.username}
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Wallet className="w-4 h-4 text-green-400" />
                            <span className="text-white font-medium">${user.balance.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <BarChart3 className="w-4 h-4 text-blue-400" />
                            <span className="text-white font-medium">${user.portfolioValue.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className={`font-bold text-lg ${rank === 1 ? "text-[#F3D393]" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-amber-600" : "text-blue-400"}`}>
                            ${user.totalValue.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-block bg-[#E8C77A]/15 text-[#F3D393] px-3 py-1 rounded-full text-sm font-medium">
                            {user.stocksCount}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="bg-gradient-to-r from-[#E8C77A] to-[#F5DFA3] hover:brightness-110 text-[#241006] px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Refreshing..." : "Refresh Leaderboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
