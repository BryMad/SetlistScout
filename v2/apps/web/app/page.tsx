"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Suggestion {
  mbid: string;
  name: string;
  disambiguation: string | null;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/artists?q=${encodeURIComponent(trimmed)}`);
        const data = (await res.json()) as { artists: Suggestion[] };
        setSuggestions(data.artists);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 pb-32">
      <h1 className="text-4xl font-bold tracking-tight">
        Setlist<span className="text-indigo-400">Scout</span>
      </h1>
      <p className="mt-3 text-center text-zinc-400">
        Know the setlist before the show.
      </p>

      <div className="relative mt-10 w-full">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for an artist…"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-lg outline-none placeholder:text-zinc-500 focus:border-indigo-500"
        />
        {searching && (
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
            searching…
          </span>
        )}

        {suggestions.length > 0 && (
          <ul className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            {suggestions.map((artist) => (
              <li key={artist.mbid}>
                <button
                  onClick={() =>
                    router.push(
                      `/artist/${artist.mbid}?name=${encodeURIComponent(artist.name)}`
                    )
                  }
                  className="flex w-full items-baseline gap-2 px-5 py-3 text-left hover:bg-zinc-800"
                >
                  <span className="font-medium">{artist.name}</span>
                  {artist.disambiguation && (
                    <span className="truncate text-sm text-zinc-500">
                      {artist.disambiguation}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-6 text-sm text-zinc-600">
        Powered by setlist.fm data and the v2 prediction engine.
      </p>
    </main>
  );
}
