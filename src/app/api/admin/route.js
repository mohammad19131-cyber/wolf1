import { NextResponse } from "next/server";
import { createServerClient, hasSupabaseConfig } from "../../lib/supabase";
import { requireAdmin } from "../../lib/auth";
import { getLocalUsers } from "../../lib/localUsers";
import bcrypt from "bcryptjs";

export async function GET(req) {
	try {
		const { response } = await requireAdmin(req);
		if (response) return response;

		if (!hasSupabaseConfig()) {
			const users = getLocalUsers().map(({ username, balance, stocks }) => ({
				username,
				balance,
				stocks,
			}));
			return NextResponse.json({ users });
		}

		const supabase = createServerClient();
		const { data: users, error } = await supabase
			.from("users")
			.select("username, balance, stocks");

		if (error) {
			console.error("Admin GET error:", error.message);
			return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
		}

		return NextResponse.json({ users: users || [] });
	} catch (error) {
		console.error("Admin GET error:", error);
		return NextResponse.json({ error: "Network error" }, { status: 500 });
	}
}

export async function POST(req) {
	try {
		const { response } = await requireAdmin(req);
		if (response) return response;

		const { username, password, balance } = await req.json();

		if (!username || !password || balance == null) {
			return NextResponse.json({ error: "Missing fields" }, { status: 400 });
		}

		if (!hasSupabaseConfig()) {
			return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
		}

		const supabase = createServerClient();
		const { data: existing } = await supabase
			.from("users")
			.select("username")
			.eq("username", username)
			.single();

		if (existing) {
			return NextResponse.json({ error: "username already exists" }, { status: 409 });
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		const { data: user, error } = await supabase
			.from("users")
			.insert([{ username, password: hashedPassword, balance, stocks: [] }])
			.select("username, balance")
			.single();

		if (error) {
			console.error("Admin POST error:", error.message);
			return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
		}

		return NextResponse.json({ success: true, user: { username: user.username, balance: user.balance } });
	} catch (error) {
		console.error("Admin POST error:", error);
		return NextResponse.json({ error: "Network error" }, { status: 500 });
	}
}

export async function PUT(req) {
	try {
		const { response } = await requireAdmin(req);
		if (response) return response;

		const { username, balance, stocks } = await req.json();

		if (!username || balance == null) {
			return NextResponse.json({ error: "Missing fields" }, { status: 400 });
		}

		if (!hasSupabaseConfig()) {
			return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
		}

		const supabase = createServerClient();
		const updateData = { balance };
		if (stocks) {
			updateData.stocks = stocks;
		}

		const { data: user, error } = await supabase
			.from("users")
			.update(updateData)
			.eq("username", username)
			.select("username, balance, stocks")
			.single();

		if (error || !user) {
			console.error("Admin PUT error:", error?.message);
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			user: {
				username: user.username,
				balance: user.balance,
				stocks: user.stocks || [],
			},
		});
	} catch (error) {
		console.error("Admin PUT error:", error);
		return NextResponse.json({ error: "Network error" }, { status: 500 });
	}
}

export async function DELETE(req) {
	try {
		const { response } = await requireAdmin(req);
		if (response) return response;

		const { username } = await req.json();

		if (!username) {
			return NextResponse.json({ error: "Missing username" }, { status: 400 });
		}

		if (!hasSupabaseConfig()) {
			return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
		}

		const supabase = createServerClient();
		const { error } = await supabase
			.from("users")
			.delete()
			.eq("username", username);

		if (error) {
			console.error("Admin DELETE error:", error.message);
			return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Admin DELETE error:", error);
		return NextResponse.json({ error: "Network error" }, { status: 500 });
	}
}
