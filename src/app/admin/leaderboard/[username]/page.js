"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, Wallet, BarChart3, Package, Trophy, Gavel } from "lucide-react";
import AdminNavbar from "../../../components/AdminNavbar";

export default function UserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username;
  
  const [user, setUser] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [liveBids, setLiveBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUserDetails();
  }, [username]);

  async function fetchUserDetails() {
    try {
      setLoading(true);
      setError("");

      // Fetch all users to find this specific user
      const usersRes = await fetch("/api/admin", {
        credentials: "include",
      });
      if (!usersRes.ok) throw new Error("Failed to fetch users");
      const usersData = await usersRes.json();
      
      const foundUser = usersData.users.find(u => u.username === username);
      if (!foundUser) throw new Error("User not found");


      const stocksRes = await fetch("/api/stocks");
      if (!stocksRes.ok) throw new Error("Failed to fetch stocks");
      const stocksData = await stocksRes.json();


      const bidsRes = await fetch("/api/livebids");
      if (!bidsRes.ok) throw new Error("Failed to fetch live bids");
      const bidsData = await bidsRes.json();

      setUser(foundUser);
      setStocks(stocksData.stocks);
      setLiveBids(bidsData.bids || []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B0304] via-[#1B080C] to-[#2A0B10] flex items-center justify-center">
        <div className="text-white text-xl">Loading user details...</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B0304] via-[#1B080C] to-[#2A0B10]">
        <AdminNavbar />
        <div className="container mx-auto px-4 py-6">
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded">
            {error || "User not found"}
          </div>
          <button
            onClick={() => router.push("/admin/leaderboard")}
            className="mt-4 bg-[#E8C77A] hover:bg-[#F5DFA3] text-[#241006] px-4 py-2 rounded-lg"
          >
            Back to Leaderboard
          </button>
        </div>
      </div>
    );
  }

  // Calculate portfolio value
  const portfolioValue = (user.stocks || []).reduce((sum, holding) => {
    const stock = stocks.find(s => s.id === holding.stockId);
    if (stock) {
      return sum + (stock.StockValue * holding.quantity);
    } else if (holding.stockId && holding.stockId.startsWith("bid:")) {
      return sum + (holding.avgPrice * holding.quantity);
    }
    return sum;
  }, 0);

  const totalValue = user.balance + portfolioValue;


  const regularStocks = (user.stocks || []).filter(h => !h.stockId.startsWith("bid:"));
  const liveBidHoldings = (user.stocks || []).filter(h => h.stockId.startsWith("bid:"));

  const wonBids = liveBids.filter(bid => {
    if (!bid.bids || bid.bids.length === 0) return false;
    const highestBid = bid.bids.reduce((max, b) => (Number(b.value) > Number(max.value) ? b : max), bid.bids[0]);
    return highestBid.user === username && bid.status === "awarded";
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0304] via-[#1B080C] to-[#2A0B10]">
      <AdminNavbar />
      
      <div className="container mx-auto px-4 py-6 max-w-6xl">

        <button
          onClick={() => router.push("/admin/leaderboard")}
          className="flex items-center gap-2 text-[#F3D393] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Leaderboard</span>
        </button>

        <div className="bg-gradient-to-br from-[#42121B]/40 to-[#23080D]/60 backdrop-blur-sm border border-[#E8C77A]/20 rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-4">{username}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-black/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-green-400" />
                <span className="text-sm" style={{ color: '#D3C3C5' }}>Balance</span>
              </div>
              <p className="text-white text-2xl font-bold">${user.balance.toLocaleString()}</p>
            </div>

            <div className="bg-black/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <span className="text-sm" style={{ color: '#D3C3C5' }}>Portfolio Value</span>
              </div>
              <p className="text-white text-2xl font-bold">${portfolioValue.toLocaleString()}</p>
            </div>

            <div className="bg-black/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-[#F3D393]" />
                <span className="text-sm" style={{ color: '#D3C3C5' }}>Total Value</span>
              </div>
              <p className="text-white text-2xl font-bold">${totalValue.toLocaleString()}</p>
            </div>

            <div className="bg-black/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-[#E8C77A]" />
                <span className="text-sm" style={{ color: '#D3C3C5' }}>Total Holdings</span>
              </div>
              <p className="text-white text-2xl font-bold">{(user.stocks || []).length}</p>
            </div>
          </div>
        </div>


        <div className="bg-gradient-to-br from-[#42121B]/25 to-[#23080D]/35 backdrop-blur-sm border border-[#3D171E] rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-400" />
            Stock Portfolio
          </h2>

          {regularStocks.length === 0 ? (
            <p className="text-center py-8" style={{ color: '#D3C3C5' }}>No stocks owned yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#3D171E]">
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: '#D3C3C5' }}>Stock</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: '#D3C3C5' }}>Shares</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: '#D3C3C5' }}>Avg Price</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: '#D3C3C5' }}>Current Price</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: '#D3C3C5' }}>Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {regularStocks.map((holding, index) => {
                    const stock = stocks.find(s => s.id === holding.stockId);
                    const currentValue = stock ? stock.StockValue * holding.quantity : 0;

                    return (
                      <tr key={index} className="border-b border-[#3D171E]/60 hover:bg-[#E8C77A]/5">
                        <td className="px-4 py-3 text-white font-medium">
                          {holding.stockName || "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-right text-white">
                          {holding.quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-white">
                          ${holding.avgPrice.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-white">
                          ${stock ? stock.StockValue.toLocaleString() : "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-bold">
                          ${currentValue.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>


        {liveBidHoldings.length > 0 && (
          <div className="bg-gradient-to-br from-[#42121B]/25 to-[#23080D]/35 backdrop-blur-sm border border-[#3D171E] rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Gavel className="w-6 h-6 text-[#F3D393]" />
              Won Live Bids
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#3D171E]">
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: '#D3C3C5' }}>Item</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: '#D3C3C5' }}>Quantity</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: '#D3C3C5' }}>Price Paid</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: '#D3C3C5' }}>Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {liveBidHoldings.map((holding, index) => {
                    const totalValue = holding.avgPrice * holding.quantity;
                    return (
                      <tr key={index} className="border-b border-[#3D171E]/60 hover:bg-[#E8C77A]/5">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-block bg-[#E8C77A]/20 text-[#F3D393] px-2 py-1 rounded text-xs font-bold">
                              LIVE BID
                            </span>
                            <span className="text-white font-medium">{holding.stockName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-white">
                          {holding.quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-white">
                          ${holding.avgPrice.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-bold">
                          ${totalValue.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {wonBids.length > 0 && (
          <div className="bg-gradient-to-br from-[#F3D393]/10 to-[#CBA158]/10 backdrop-blur-sm border border-[#F3D393]/30 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-[#F3D393]" />
              Awarded Bids
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wonBids.map((bid) => {
                const highestBid = bid.bids.reduce((max, b) => (Number(b.value) > Number(max.value) ? b : max), bid.bids[0]);
                return (
                  <div key={bid.id} className="bg-black/30 rounded-lg p-4 border border-[#F3D393]/30">
                    <h3 className="text-white font-bold mb-2">{bid.stockName}</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span style={{ color: '#D3C3C5' }}>Winning Bid:</span>
                        <span className="text-white font-bold">${Number(highestBid.value).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: '#D3C3C5' }}>Quantity:</span>
                        <span className="text-white">{bid.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: '#D3C3C5' }}>Status:</span>
                        <span className="text-green-400 font-bold">AWARDED ✓</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
