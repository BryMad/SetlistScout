"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Suggestion {
  mbid: string;
  name: string;
  disambiguation: string | null;
  image: string | null;
}

interface ArtistSearchProps {
  variant?: "hero" | "header";
  autoFocus?: boolean;
}

/**
 * Artist search with suggestion dropdown. Follows the Spotify design
 * guidelines the old site implemented: 40px circular artist images shown
 * unaltered, platform sans-serif metadata, and Spotify logo attribution
 * (full logo, ≥70px) wherever Spotify content appears.
 */
export default function ArtistSearch({
  variant = "hero",
  autoFocus = false,
}: ArtistSearchProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setAttempted(false);
      return;
    }
    setSearching(true);
    setOpen(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/artists?q=${encodeURIComponent(trimmed)}`);
        const data = (await res.json()) as { artists: Suggestion[] };
        setSuggestions(data.artists);
        setAttempted(true);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function select(artist: Suggestion) {
    setOpen(false);
    setQuery("");
    setSuggestions([]);
    setAttempted(false);
    router.push(`/artist/${artist.mbid}?name=${encodeURIComponent(artist.name)}`);
  }

  const isHero = variant === "hero";

  return (
    <div ref={rootRef} className={`relative ${isHero ? "w-full" : "w-56 sm:w-80"}`}>
      <input
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        placeholder="Search for an artist…"
        className={
          isHero
            ? "w-full rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-lg outline-none placeholder:text-zinc-500 focus:border-indigo-500"
            : "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm outline-none placeholder:text-zinc-500 focus:border-indigo-500"
        }
      />

      {open && (searching || suggestions.length > 0 || attempted) && (
        <div className="absolute z-50 mt-2 w-full min-w-64 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
          {searching && (
            <div className="px-4 py-3 text-sm text-zinc-400">Searching…</div>
          )}
          {!searching && attempted && suggestions.length === 0 && (
            <div className="px-4 py-3 text-sm text-zinc-400">No artists found</div>
          )}
          <ul className="max-h-96 overflow-y-auto">
            {suggestions.map((artist) => (
              <li key={artist.mbid}>
                <button
                  onClick={() => select(artist)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-800"
                >
                  {artist.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artist.image}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-zinc-300">
                      {artist.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-white">{artist.name}</span>
                    {artist.disambiguation && (
                      <span className="block truncate text-xs text-zinc-500">
                        {artist.disambiguation}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <a
            href="https://open.spotify.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-2 border-t border-zinc-800 px-4 py-2.5"
          >
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              powered by
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/spotify-logo-green.png" alt="Spotify" className="h-6 w-auto" />
          </a>
        </div>
      )}
    </div>
  );
}
