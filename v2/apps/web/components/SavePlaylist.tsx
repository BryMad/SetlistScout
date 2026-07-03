"use client";

import { useState } from "react";

interface SavePlaylistProps {
  playlistName: string;
  description: string;
  uris: string[];
}

export default function SavePlaylist({ playlistName, description, uris }: SavePlaylistProps) {
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);

  async function save() {
    setState("saving");
    try {
      const res = await fetch("/api/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playlistName, description, uris }),
      });
      if (res.status === 401) {
        const back = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/auth/login?return=${back}`;
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (!res.ok) throw new Error("save failed");
      setPlaylistUrl(data.url ?? null);
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-emerald-400">Playlist saved ✓</span>
        {playlistUrl && (
          <a
            href={playlistUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[#1DB954] px-5 py-2 text-sm font-semibold text-black hover:brightness-110"
          >
            Open in Spotify ↗
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={save}
        disabled={state === "saving" || uris.length === 0}
        className="rounded-full bg-[#1DB954] px-5 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50"
      >
        {state === "saving"
          ? "Saving…"
          : `Save ${uris.length} songs as Spotify playlist`}
      </button>
      {state === "error" && (
        <span className="text-sm text-rose-400">Something went wrong — try again.</span>
      )}
    </div>
  );
}
