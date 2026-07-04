import Link from "next/link";
import SectionNav from "@/components/SectionNav";
import { getAllShows } from "@/lib/data";
import { summarizeTours } from "@setlistscout/engine";

// serverless budget: a cold full-history crawl of a legacy act takes ~15-25s
export const maxDuration = 60;

interface PageProps {
  params: Promise<{ mbid: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ToursPage({ params, searchParams }: PageProps) {
  const { mbid } = await params;
  const sp = await searchParams;
  const name = typeof sp.name === "string" ? sp.name : "Artist";

  const shows = await getAllShows(mbid);
  const tours = summarizeTours(shows);
  const query = `?name=${encodeURIComponent(name)}`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="cascade-in text-3xl font-semibold tracking-tight">{name}</h1>
      <SectionNav mbid={mbid} name={name} active="relive" />

      <p className="cascade-in mt-6 text-sm text-zinc-500 [animation-delay:120ms]">
        {tours.length} tours across {shows.length} recorded shows. Pick a tour to
        see what got played — or drill into a single night.
      </p>

      <ul className="mt-6 space-y-2">
        {tours.map((tour, index) => (
          <li
            key={tour.name}
            className="cascade-in"
            style={{ animationDelay: `${180 + Math.min(index, 12) * 60}ms` }}
          >
            <Link
              href={`/artist/${mbid}/tour/${encodeURIComponent(tour.name)}${query}`}
              className="flex items-baseline justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4 hover:border-indigo-600 hover:bg-zinc-900"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">{tour.name}</span>
                <span className="font-mono text-xs text-zinc-500">{tour.years}</span>
              </span>
              <span className="shrink-0 font-mono text-xs text-zinc-400">
                {tour.showCount} show{tour.showCount === 1 ? "" : "s"}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {tours.length === 0 && (
        <p className="mt-10 text-zinc-400">
          setlist.fm has no tour-tagged shows for this artist.
        </p>
      )}
    </main>
  );
}
