import { NextResponse, type NextRequest } from "next/server";
import { spotify } from "@/lib/data";
import { redirectUriFor, writeSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  let saved: { state?: string; returnTo?: string } | null = null;
  try {
    saved = JSON.parse(request.cookies.get("sp_oauth")?.value ?? "null");
  } catch {
    saved = null;
  }

  if (!code || !saved?.state || saved.state !== state) {
    return NextResponse.redirect(new URL("/?auth=failed", request.nextUrl.origin));
  }

  const tokens = await spotify.exchangeCode(code, redirectUriFor(request));
  const response = NextResponse.redirect(
    new URL(saved.returnTo ?? "/", request.nextUrl.origin)
  );
  writeSession(response, {
    access: tokens.access_token,
    refresh: tokens.refresh_token ?? "",
    expiresAt: Date.now() + tokens.expires_in * 1000,
  });
  response.cookies.delete("sp_oauth");
  return response;
}
