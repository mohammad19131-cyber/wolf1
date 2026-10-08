export async function executeTrade(supabase, username, action, stockId, quantity) {
  const qty = Number(quantity);
  if (!["buy", "sell"].includes(action) || !stockId || !Number.isFinite(qty) || qty <= 0) {
    return { error: "Invalid request data", status: 400 };
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("username, balance, stocks")
    .eq("username", username)
    .single();

  if (userError || !user) {
    return { error: "User not found", status: 404 };
  }

  const { data: stock, error: stockError } = await supabase
    .from("stocks")
    .select("id, StockName, StockValue")
    .eq("id", stockId)
    .single();

  if (stockError || !stock) {
    return { error: "Invalid stock selected", status: 400 };
  }

  const holdings = Array.isArray(user.stocks) ? [...user.stocks] : [];
  const idx = holdings.findIndex((h) => h.stockId === stock.id);
  const price = Number(stock.StockValue);
  const balance = Number(user.balance);
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Invalid stock price", status: 400 };
  }
  if (!Number.isFinite(balance)) {
    return { error: "Invalid balance", status: 400 };
  }

  const total = price * qty;
  let nextBalance = balance;
  const nextHoldings = holdings;

  if (action === "buy") {
    if (balance < total) {
      return { error: "Insufficient balance", status: 400 };
    }
    nextBalance = balance - total;
    if (nextBalance < 0) {
      return { error: "Insufficient balance", status: 400 };
    }

    if (idx >= 0) {
      const prevQty = Number(holdings[idx].quantity);
      const prevAvg = Number(holdings[idx].avgPrice);
      const newQty = prevQty + qty;
      nextHoldings[idx] = {
        ...holdings[idx],
        quantity: newQty,
        avgPrice: (prevAvg * prevQty + total) / newQty,
      };
    } else {
      nextHoldings.push({
        stockId: stock.id,
        stockName: stock.StockName,
        quantity: qty,
        avgPrice: price,
      });
    }
  } else {
    if (idx < 0 || Number(holdings[idx].quantity) < qty) {
      return { error: "Not enough shares to sell", status: 400 };
    }

    nextBalance = balance + total;
    nextHoldings[idx] = { ...holdings[idx], quantity: Number(holdings[idx].quantity) - qty };
    if (nextHoldings[idx].quantity === 0) nextHoldings.splice(idx, 1);
  }

  const { data: updated, error: updateError } = await supabase
    .from("users")
    .update({ balance: nextBalance, stocks: nextHoldings })
    .eq("username", username)
    .eq("balance", user.balance)
    .select("username, balance, stocks")
    .maybeSingle();

  if (updateError) {
    return { error: "Failed to update balance", status: 500 };
  }
  if (!updated) {
    return { error: "Balance changed, please retry", status: 409 };
  }

  return {
    success: true,
    user: {
      username: updated.username,
      balance: updated.balance,
      stocks: updated.stocks || [],
    },
  };
}
