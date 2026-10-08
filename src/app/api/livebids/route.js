import { NextResponse } from "next/server";
import { createServerClient, hasSupabaseConfig } from "../../lib/supabase";
import { requireAdmin } from "../../lib/auth";
import { expireBids, expireBidIfNeeded, serializeBid, startPatch, updateWithFallback } from "../../lib/livebids";

const RETIRED = NextResponse.json(
	{ error: "Live bidding is no longer part of the competition" },
	{ status: 410 }
);

export async function DELETE(req) {
	return RETIRED;

	try {
		const { response } = await requireAdmin(req);
		if (response) return response;

		const { searchParams } = new URL(req.url);
		const id = searchParams.get("id");
		
		if (!id) {
			return NextResponse.json({ error: "Missing id" }, { status: 400 });
		}

		if (!hasSupabaseConfig()) {
			return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
		}

		const supabase = createServerClient();
		
		const { error } = await supabase
			.from('livebids')
			.delete()
			.eq('id', id);

		if (error) {
			console.error("LiveBids DELETE error:", error.message);
			return NextResponse.json({ error: "Bid not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("LiveBids DELETE error:", err);
		return NextResponse.json({ error: "Network error" }, { status: 500 });
	}
}

export async function GET() {
	try {
		if (!hasSupabaseConfig()) {
			return NextResponse.json({ bids: [] });
		}

		const supabase = createServerClient();
		
		const { data: bids, error } = await supabase
			.from('livebids')
			.select('*')
			.order('created_at', { ascending: false });

		if (error) {
			const fallback = await supabase.from('livebids').select('*');
			if (fallback.error) {
				console.error("LiveBids GET error:", error.message);
				return NextResponse.json({ error: "Failed to fetch bids" }, { status: 500 });
			}
			const expired = await expireBids(supabase, fallback.data || []);
			return NextResponse.json({ bids: expired });
		}

		const expired = await expireBids(supabase, bids || []);
		return NextResponse.json({ bids: expired });
	} catch (err) {
		console.error("LiveBids GET error:", err);
		return NextResponse.json({ error: "Network error" }, { status: 500 });
	}
}

export async function POST(req) {
	return RETIRED;

	try {
		const { response } = await requireAdmin(req);
		if (response) return response;

		const { stockName, value, quantity, durationSeconds } = await req.json();
		
		if (!stockName || !value || !quantity) {
			return NextResponse.json({ error: "Missing fields" }, { status: 400 });
		}

		if (!hasSupabaseConfig()) {
			return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
		}

		const supabase = createServerClient();
		const row = { stockName, value, quantity, status: 'inactive', bids: [] };
		if (Number(durationSeconds) > 0) {
			row.duration_seconds = Number(durationSeconds);
		}
		
		let { data: bid, error } = await supabase
			.from('livebids')
			.insert([row])
			.select()
			.single();

		if (error && row.duration_seconds != null) {
			delete row.duration_seconds;
			const retry = await supabase.from('livebids').insert([row]).select().single();
			bid = retry.data;
			error = retry.error;
		}

		if (error) {
			console.error("LiveBids POST error:", error.message);
			return NextResponse.json({ error: "Failed to create bid" }, { status: 400 });
		}

		return NextResponse.json({ success: true, bid: serializeBid(bid) });
	} catch (err) {
		console.error("LiveBids POST error:", err);
		return NextResponse.json({ error: "Network error" }, { status: 500 });
	}
}

export async function PUT(req) {
	return RETIRED;

	try {
		const { response } = await requireAdmin(req);
		if (response) return response;

		const { id, action, durationSeconds } = await req.json();
		
		if (!id || !action) {
			return NextResponse.json({ error: "Missing fields" }, { status: 400 });
		}

		if (!hasSupabaseConfig()) {
			return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
		}

		const supabase = createServerClient();
		
		const { data: existing, error: fetchError } = await supabase
			.from('livebids')
			.select('*')
			.eq('id', id)
			.single();

		if (fetchError || !existing) {
			console.error("LiveBids PUT error:", fetchError?.message);
			return NextResponse.json({ error: "Bid not found" }, { status: 404 });
		}

		const bid = await expireBidIfNeeded(supabase, existing);

		if (action === "start") {
			if (bid.status === "awarded") {
				return NextResponse.json({ error: "Cannot start an awarded bid" }, { status: 400 });
			}
			if (bid.status === "active" && !bid.timer?.expired) {
				return NextResponse.json({ success: true, bid });
			}
			if (bid.status !== "inactive") {
				return NextResponse.json({ error: "Bid must be inactive to start" }, { status: 400 });
			}

			const patch = startPatch(bid, durationSeconds);
			const { data: updatedBid, error } = await updateWithFallback(
				supabase,
				id,
				patch,
				{ status: "active" }
			);

			if (error || !updatedBid) {
				console.error("LiveBids PUT start error:", error?.message);
				return NextResponse.json({ error: "Failed to update bid" }, { status: 500 });
			}

			return NextResponse.json({ success: true, bid: serializeBid(updatedBid) });
		}

		if (action === "stop") {
			if (bid.status === "awarded") {
				return NextResponse.json({ error: "Cannot stop an awarded bid" }, { status: 400 });
			}
			if (bid.status !== "active") {
				return NextResponse.json({ success: true, bid });
			}

			const { data: updatedBid, error } = await supabase
				.from('livebids')
				.update({ status: "inactive" })
				.eq('id', id)
				.eq('status', "active")
				.select()
				.maybeSingle();

			if (error) {
				console.error("LiveBids PUT stop error:", error.message);
				return NextResponse.json({ error: "Failed to update bid" }, { status: 500 });
			}

			return NextResponse.json({ success: true, bid: serializeBid(updatedBid || { ...bid, status: "inactive" }) });
		}

		if (action === "award") {
			if (bid.status === "awarded") {
				return NextResponse.json({ error: "Bid already awarded" }, { status: 400 });
			}
			if (bid.status === "active") {
				return NextResponse.json({ error: "Stop the bid before awarding" }, { status: 400 });
			}
			if (bid.status !== "inactive") {
				return NextResponse.json({ error: "Bid must be stopped before awarding" }, { status: 400 });
			}
			if (!bid.bids || bid.bids.length === 0) {
				return NextResponse.json({ error: "No bids placed" }, { status: 400 });
			}

			const highest = bid.bids.reduce((max, b) => Number(b.value) > Number(max.value) ? b : max, bid.bids[0]);
			const bidAmount = Number(highest.value);
			
			const { data: user, error: userError } = await supabase
				.from('users')
				.select('*')
				.eq('username', highest.user)
				.single();

			if (userError || !user) {
				console.error("LiveBids PUT award error:", userError?.message);
				return NextResponse.json({ error: "Winner not found" }, { status: 404 });
			}

			if (Number(user.balance) < bidAmount) {
				return NextResponse.json({ error: "Insufficient balance for winner" }, { status: 400 });
			}

			let holdings = Array.isArray(user.stocks) ? [...user.stocks] : [];
			const idx = holdings.findIndex(h => h.stockName === bid.stockName);
			
			if (idx >= 0) {
				const prevQty = holdings[idx].quantity;
				const prevAvg = holdings[idx].avgPrice;
				const newQty = prevQty + bid.quantity;
				const newAvg = ((prevAvg * prevQty) + bidAmount) / newQty;
				
				holdings[idx].quantity = newQty;
				holdings[idx].avgPrice = newAvg;
			} else {
				holdings.push({ 
					stockId: "bid:" + bid.id, 
					stockName: bid.stockName, 
					quantity: bid.quantity, 
					avgPrice: bidAmount / bid.quantity 
				});
			}

			const { data: claimed, error: bidUpdateError } = await supabase
				.from('livebids')
				.update({ status: "awarded", winner: highest.user })
				.eq('id', id)
				.eq('status', "inactive")
				.select("id")
				.maybeSingle();

			if (bidUpdateError) {
				console.error("LiveBids PUT award bid update error:", bidUpdateError.message);
				return NextResponse.json({ error: "Failed to update bid" }, { status: 500 });
			}
			if (!claimed) {
				return NextResponse.json({ error: "Bid already awarded" }, { status: 409 });
			}

			const { data: updatedUser, error: userUpdateError } = await supabase
				.from('users')
				.update({ 
					balance: Number(user.balance) - bidAmount,
					stocks: holdings
				})
				.eq('username', highest.user)
				.eq('balance', user.balance)
				.select("username")
				.maybeSingle();

			if (userUpdateError || !updatedUser) {
				await supabase
					.from('livebids')
					.update({ status: "inactive", winner: null })
					.eq('id', id)
					.eq('status', "awarded");
				console.error("LiveBids PUT award user update error:", userUpdateError?.message);
				return NextResponse.json({ error: "Failed to update winner wallet. Award was not applied." }, { status: 409 });
			}

			return NextResponse.json({ 
				success: true, 
				winner: highest.user, 
				bidAmount,
				quantity: bid.quantity,
				stockName: bid.stockName
			});
		}

		return NextResponse.json({ error: "Invalid action" }, { status: 400 });
	} catch (err) {
		console.error("LiveBids PUT error:", err);
		return NextResponse.json({ error: "Network error" }, { status: 500 });
	}
}
