import { NextResponse } from "next/server";
import { searchArtistsWithImages } from "@/lib/data";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ artists: [] });

  const artists = await searchArtistsWithImages(query);
  return NextResponse.json({ artists });
}
