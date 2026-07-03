import type { NextRequest, NextResponse } from "next/server";

/** Spotify user session, stored as an HttpOnly cookie. Redis can replace this later. */
export interface SpotifySession {
  access: string;
  refresh: string;
  expiresAt: number;
}

const SESSION_COOKIE = "sp_session";

export function readSession(request: NextRequest): SpotifySession | null {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SpotifySession>;
    if (typeof parsed.access !== "string" || typeof parsed.refresh !== "string") return null;
    return { access: parsed.access, refresh: parsed.refresh, expiresAt: parsed.expiresAt ?? 0 };
  } catch {
    return null;
  }
}

export function writeSession(response: NextResponse, session: SpotifySession): void {
  response.cookies.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function redirectUriFor(request: NextRequest): string {
  return (
    process.env.SPOTIFY_REDIRECT_URI ??
    new URL("/auth/callback", request.nextUrl.origin).toString()
  );
}

/**
 * Origin to send users back to after OAuth. Derived from the registered
 * redirect URI, NOT request.nextUrl.origin — Next dev reports "localhost"
 * there even when the browser is on 127.0.0.1, and cookies don't cross
 * between the two hosts.
 */
export function appOrigin(request: NextRequest): string {
  return new URL(redirectUriFor(request)).origin;
}
