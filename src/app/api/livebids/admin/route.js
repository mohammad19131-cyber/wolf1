import { NextResponse } from "next/server";
import { createServerClient, hasSupabaseConfig } from "../../../lib/supabase";
import { requireAdmin } from "../../../lib/auth";

export async function GET(req) {
	try {
		const { response } = await requireAdmin(req);
		if (response) return response;

		const { searchParams } = new URL(req.url);
		const id = searchParams.get("id");

		if (!id) {
			return NextResponse.json({ error: "Missing id" }, { status: 400 });
		}

		if (!hasSupabaseConfig()) {
			return NextResponse.json({ bids: [] });
		}

		const supabase = createServerClient();
		const { data: bid, error } = await supabase
			.from("livebids")
			.select("bids")
			.eq("id", id)
			.single();

		if (error || !bid) {
			return NextResponse.json({ error: "Bid not found" }, { status: 404 });
		}

		return NextResponse.json({ bids: bid.bids || [] });
	} catch (err) {
		console.error("LiveBids admin GET error:", err);
		return NextResponse.json({ error: "Network error" }, { status: 500 });
	}
}
