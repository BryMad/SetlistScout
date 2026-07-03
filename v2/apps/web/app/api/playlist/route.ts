import { NextResponse, type NextRequest } from "next/server";
import { SpotifyError } from "@setlistscout/clients";
import { spotify } from "@/lib/data";
import { readSession, writeSession, type SpotifySession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const session = readSession(request);
  if (!session || !session.refresh) {
    return NextResponse.json({ needsAuth: true }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    description?: string;
    uris?: string[];
  };
  const uris = (body.uris ?? []).filter((u) => typeof u === "string").slice(0, 500);
  if (!body.name || uris.length === 0) {
    return NextResponse.json({ error: "name and uris are required" }, { status: 400 });
  }

  // refresh the access token if it's expired or about to
  let updated: SpotifySession | null = null;
  let accessToken = session.access;
  if (Date.now() > session.expiresAt - 60_000) {
    const refreshed = await spotify.refreshAccessToken(session.refresh);
    accessToken = refreshed.access_token;
    updated = {
      access: refreshed.access_token,
      refresh: refreshed.refresh_token ?? session.refresh,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
    };
  }

  try {
    const playlist = await spotify.createPlaylist(accessToken, {
      name: body.name,
      description: body.description,
      uris,
    });
    const response = NextResponse.json({ url: playlist.url });
    if (updated) writeSession(response, updated);
    return response;
  } catch (error) {
    if (error instanceof SpotifyError && error.status === 401) {
      return NextResponse.json({ needsAuth: true }, { status: 401 });
    }
    return NextResponse.json({ error: "playlist creation failed" }, { status: 502 });
  }
}
