import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServerClient, hasSupabaseConfig } from "../../lib/supabase";
import { createAuthToken } from "../../lib/auth";
import { findLocalUser } from "../../lib/localUsers";

function getAdminUsername() {
	return process.env.ADMIN_USERNAME || "";
}

function getAdminPassword() {
	return process.env.ADMIN_PASSWORD || "";
}

function isBcryptHash(value) {
	return typeof value === "string" && /^\$2[aby]\$/.test(value);
}

async function passwordsMatch(stored, provided) {
	if (!stored || !provided) return false;
	if (isBcryptHash(stored)) {
		return bcrypt.compare(provided, stored);
	}
	return stored === provided;
}

async function loginSuccess(username, { isAdmin = false, balance = 10000, stocks = [] } = {}) {
	const token = await createAuthToken(username, isAdmin);
	const response = NextResponse.json({
		success: true,
		user: { username, balance, stocks },
		tokenType: isAdmin ? "admin" : "user",
	});

	response.cookies.set("auth_token", token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		path: "/",
		maxAge: 60 * 60 * 24 * 7,
	});

	return response;
}

export async function POST(req) {
	try {
		const { username, password } = await req.json();

		if (!username || !password) {
			return NextResponse.json(
				{ error: "Missing username or password" },
				{ status: 400 }
			);
		}

		const cleanUsername = username.trim();
		const cleanPassword = password.trim();

		const adminUsername = getAdminUsername();
		const adminPassword = getAdminPassword();
		if (
			adminUsername &&
			adminPassword &&
			cleanUsername === adminUsername &&
			cleanPassword === adminPassword
		) {
			return await loginSuccess(cleanUsername, { isAdmin: true });
		}

		if (!hasSupabaseConfig()) {
			const localUser = findLocalUser(cleanUsername);
			if (localUser && localUser.password === cleanPassword) {
				return await loginSuccess(localUser.username, {
					isAdmin: false,
					balance: localUser.balance,
					stocks: localUser.stocks,
				});
			}

			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		const supabase = createServerClient();
		const { data: user, error } = await supabase
			.from("users")
			.select("*")
			.eq("username", cleanUsername)
			.single();

		if (error || !user) {
			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		const matches = await passwordsMatch(user.password, cleanPassword);
		if (!matches) {
			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		return await loginSuccess(user.username, {
			isAdmin: false,
			balance: user.balance ?? 10000,
			stocks: user.stocks ?? [],
		});
	} catch (error) {
		console.error("Login error:", error);
		const message = error?.message?.includes("AUTH_SECRET")
			? "Server is misconfigured (missing AUTH_SECRET). Contact the administrator."
			: "Network error";
		return NextResponse.json(
			{ error: message },
			{ status: 500 }
		);
	}
}
