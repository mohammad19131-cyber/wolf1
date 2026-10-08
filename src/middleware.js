import { NextResponse } from "next/server";
import { verifyAuthToken, isAdminUser } from "./app/lib/auth";

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const authCookie = request.cookies.get("auth_token");
  const decoded = authCookie?.value ? await verifyAuthToken(authCookie.value) : null;

  const isAuthenticated = Boolean(decoded);
  const isAdmin = isAdminUser(decoded);

  if (pathname.startsWith("/bids")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated || !isAdmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/crisis")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/bids",
    "/bids/:path*",
    "/crisis",
    "/crisis/:path*",
  ],
};
