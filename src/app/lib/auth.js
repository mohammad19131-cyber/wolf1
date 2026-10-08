import { NextResponse } from "next/server";

const TOKEN_MAX_AGE_MS = 60 * 60 * 24 * 7 * 1000;
const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production");
  }
  return "dev-insecure-auth-secret";
}

function toBase64Url(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function utf8ToBase64Url(str) {
  return toBase64Url(encoder.encode(str));
}

function base64UrlToUtf8(str) {
  return new TextDecoder().decode(fromBase64Url(str));
}

async function sign(payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(sig);
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createAuthToken(username, isAdmin = false) {
  const payload = utf8ToBase64Url(
    JSON.stringify({
      username,
      isAdmin: Boolean(isAdmin),
      timestamp: Date.now(),
    })
  );
  const sig = await sign(payload);
  return `${payload}.${sig}`;
}

export async function verifyAuthToken(token) {
  try {
    if (!token || typeof token !== "string") return null;
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expected = await sign(payload);
    if (!safeEqual(sig, expected)) return null;
    const data = JSON.parse(base64UrlToUtf8(payload));
    if (!data?.username) return null;
    if (typeof data.timestamp !== "number" || Date.now() - data.timestamp > TOKEN_MAX_AGE_MS) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function isAdminUser(user) {
  if (!user) return false;
  if (user.isAdmin) return true;
  const adminUsername = process.env.ADMIN_USERNAME;
  return Boolean(adminUsername && user.username === adminUsername);
}

export async function getRequestUser(req) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return null;
  return verifyAuthToken(token);
}

export async function requireUser(req) {
  const user = await getRequestUser(req);
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }
  return { user, response: null };
}

export async function requireAdmin(req) {
  const result = await requireUser(req);
  if (result.response) return result;
  if (!isAdminUser(result.user)) {
    return {
      user: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}
