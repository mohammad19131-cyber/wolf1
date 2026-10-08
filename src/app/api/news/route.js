import { NextResponse } from "next/server";
import { createServerClient, hasSupabaseConfig } from "../../lib/supabase";
import { requireAdmin } from "../../lib/auth";

export async function GET() {
	try {
		if (!hasSupabaseConfig()) {
			return NextResponse.json({ news: [] });
		}

		const supabase = createServerClient();
		
		const { data: news, error } = await supabase
			.from('news')
			.select('*')
			.order('created_at', { ascending: false });

		if (error) {
			const fallback = await supabase.from('news').select('*');
			if (fallback.error) {
				console.error("News GET error:", error.message);
				return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
			}
			return NextResponse.json({ news: fallback.data || [] });
		}

		return NextResponse.json({ news: news || [] });
	} catch (err) {
		console.error("News GET error:", err);
		return NextResponse.json({ error: "Network error" }, { status: 500 });
	}
}

export async function POST(req) {
	try {
		const { response } = await requireAdmin(req);
		if (response) return response;

		const { title, body } = await req.json();
		
		if (!title || !body) {
			return NextResponse.json({ error: "Missing fields" }, { status: 400 });
		}

		if (!hasSupabaseConfig()) {
			return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
		}

		const supabase = createServerClient();
		
		const { data: newsItem, error } = await supabase
			.from('news')
			.insert([{ title, body }])
			.select()
			.single();

		if (error) {
			console.error("News POST error:", error.message);
			return NextResponse.json({ error: "Failed to create news item" }, { status: 400 });
		}

		return NextResponse.json({ news: newsItem });
	} catch (err) {
		console.error("News POST error:", err);
		return NextResponse.json({ error: "Network error" }, { status: 500 });
	}
}

export async function PUT(req) {
	try {
		const { response } = await requireAdmin(req);
		if (response) return response;

		const { id, title, body } = await req.json();
		
		if (!id || !title || !body) {
			return NextResponse.json({ error: "Missing fields" }, { status: 400 });
		}

		if (!hasSupabaseConfig()) {
			return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
		}

		const supabase = createServerClient();
		
		const { data: newsItem, error } = await supabase
			.from('news')
			.update({ title, body })
			.eq('id', id)
			.select()
			.single();

		if (error || !newsItem) {
			console.error("News PUT error:", error?.message);
			return NextResponse.json({ error: "Failed to update news item" }, { status: 400 });
		}

		return NextResponse.json({ news: newsItem });
	} catch (err) {
		console.error("News PUT error:", err);
		return NextResponse.json({ error: "Network error" }, { status: 500 });
	}
}

export async function DELETE(req) {
	try {
		const { response } = await requireAdmin(req);
		if (response) return response;

		const { id } = await req.json();
		
		if (!id) {
			return NextResponse.json({ error: "Missing id" }, { status: 400 });
		}

		if (!hasSupabaseConfig()) {
			return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
		}

		const supabase = createServerClient();
		
		const { error } = await supabase
			.from('news')
			.delete()
			.eq('id', id);

		if (error) {
			console.error("News DELETE error:", error.message);
			return NextResponse.json({ error: "Failed to delete news item" }, { status: 400 });
		}

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("News DELETE error:", err);
		return NextResponse.json({ error: "Network error" }, { status: 500 });
	}
}
