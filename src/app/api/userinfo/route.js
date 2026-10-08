import { NextResponse } from "next/server";
import { createServerClient, hasSupabaseConfig } from "../../lib/supabase";
import { getRequestUser } from "../../lib/auth";
import { findLocalUser } from "../../lib/localUsers";

export async function GET(req) {
	try {
		const authUser = await getRequestUser(req);
		if (!authUser) {
			return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
		}

		const username = authUser.username;

		if (!hasSupabaseConfig()) {
			const localUser = findLocalUser(username);
			return NextResponse.json({
				username,
				balance: localUser?.balance ?? 10000,
				stocks: localUser?.stocks ?? [],
			});
		}

		const supabase = createServerClient();
		const { data: user, error } = await supabase
			.from("users")
			.select("username, balance, stocks")
			.eq("username", username)
			.single();

		if (error || !user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		return NextResponse.json({
			username: user.username,
			balance: user.balance ?? 10000,
			stocks: user.stocks || [],
		});
	} catch (error) {
		console.error("Userinfo error:", error);
		return NextResponse.json(
			{ error: "Network error. Please try again." },
			{ status: 500 }
		);
	}
}
