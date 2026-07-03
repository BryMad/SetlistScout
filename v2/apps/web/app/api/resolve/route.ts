import { NextResponse } from "next/server";
import { resolveArtistMbid } from "@/lib/data";

/** Resolve a selected artist name to its setlist.fm mbid. */
export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name")?.trim() ?? "";
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const mbid = await resolveArtistMbid(name);
  if (!mbid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ mbid });
}
