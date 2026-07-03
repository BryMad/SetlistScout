import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { spotify } from "@/lib/data";
import { redirectUriFor } from "@/lib/session";

export function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get("return") ?? "/";
  const state = randomUUID();

  const response = NextResponse.redirect(
    spotify.buildAuthorizeUrl({ redirectUri: redirectUriFor(request), state })
  );
  response.cookies.set("sp_oauth", JSON.stringify({ state, returnTo }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
