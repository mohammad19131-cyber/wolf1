import { NextResponse } from "next/server";
import { createServerClient, hasSupabaseConfig } from "../../../lib/supabase";
import { requireUser } from "../../../lib/auth";
import { assertCompetitionActive } from "../../../lib/competition";
import { expireBidIfNeeded, serializeBid } from "../../../lib/livebids";

const RETIRED = NextResponse.json(
	{ error: "Live bidding is no longer part of the competition" },
	{ status: 410 }
);

export async function POST(req) {
	return RETIRED;

	try {
		const { user, response } = await requireUser(req);
		if (response) return response;

		if (!hasSupabaseConfig()) {
			return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
		}

		const { id, value } = await req.json();

		if (!id || value == null) {
			return NextResponse.json({ error: "Missing fields" }, { status: 400 });
		}

		const bidAmount = Number(value);
		if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
			return NextResponse.json({ error: "Invalid bid value" }, { status: 400 });
		}

		const supabase = createServerClient();
		const gate = await assertCompetitionActive(supabase);
		if (gate.error) {
			return NextResponse.json({ error: gate.error.message }, { status: gate.error.status });
		}

		for (let attempt = 0; attempt < 3; attempt++) {
			const { data: existing, error: bidError } = await supabase
				.from("livebids")
				.select("*")
				.eq("id", id)
				.single();

			if (bidError || !existing) {
				return NextResponse.json({ error: "Bid not found" }, { status: 404 });
			}

			const bid = await expireBidIfNeeded(supabase, existing);

			if (bid.status !== "active") {
				return NextResponse.json({ error: "Bidding not active" }, { status: 400 });
			}

			const minBid = Number(bid.value) * Number(bid.quantity);
			if (bidAmount < minBid) {
				return NextResponse.json(
					{ error: `Bid must be at least $${minBid} (qty x value)` },
					{ status: 400 }
				);
			}

			const { data: userData, error: userError } = await supabase
				.from("users")
				.select("*")
				.eq("username", user.username)
				.single();

			if (userError || !userData) {
				return NextResponse.json({ error: "User not found" }, { status: 404 });
			}

			if (Number(userData.balance) < bidAmount) {
				return NextResponse.json({
					error: `Insufficient funds. Your balance: $${Number(userData.balance).toLocaleString()}, Required: $${bidAmount.toLocaleString()}`,
				}, { status: 400 });
			}

			const originalBids = Array.isArray(bid.bids) ? bid.bids : [];
			const bids = [...originalBids];
			const existingIndex = bids.findIndex((b) => b.user === user.username);

			if (existingIndex >= 0) {
				bids[existingIndex] = { ...bids[existingIndex], user: user.username, value: bidAmount };
			} else {
				bids.push({ user: user.username, value: bidAmount });
			}

			let query = supabase
				.from("livebids")
				.update({ bids })
				.eq("id", id)
				.eq("status", "active");

			if (bid.bids != null) {
				query = query.eq("bids", bid.bids);
			}

			const { data: updatedBid, error: updateError } = await query.select().maybeSingle();

			if (updateError) {
				return NextResponse.json({ error: "Failed to update bid" }, { status: 500 });
			}

			if (updatedBid) {
				return NextResponse.json({ success: true, bid: serializeBid(updatedBid) });
			}
		}

		return NextResponse.json({ error: "Bid changed, please retry" }, { status: 409 });
	} catch (err) {
		console.error("LiveBids place error:", err);
		return NextResponse.json({ error: "Network error" }, { status: 500 });
	}
}
