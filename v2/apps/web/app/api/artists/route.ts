import { NextResponse } from "next/server";
import { searchArtists } from "@/lib/data";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ artists: [] });

  const { artists } = await searchArtists(query);
  return NextResponse.json({
    artists: artists.slice(0, 8).map((artist) => ({
      mbid: artist.mbid,
      name: artist.name,
      disambiguation: artist.disambiguation ?? null,
    })),
  });
}
