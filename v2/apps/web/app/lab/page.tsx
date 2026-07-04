import Link from "next/link";
import { VARIANTS } from "@/components/lab/registry";

/* Design lab index: 10 wildly different takes on the same dummy setlist.
   Spotify zones are canonical in every variant; everything else goes wild. */

export default function LabIndexPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-indigo-400">Design lab</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Ten takes on the same setlist</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Same dummy data everywhere — a fictional band, 12 songs, every likelihood band, one cover, one
        unmatched track. The Spotify zones (64px art, stacked track metadata, OPEN SPOTIFY) stay
        canonical in all ten; everything else goes wild. Use the pill at the bottom of each page to
        flip through.
      </p>

      <ol className="mt-8 grid gap-3 sm:grid-cols-2">
        {VARIANTS.map((v, i) => (
          <li key={v.slug}>
            <Link
              href={`/lab/${v.slug}`}
              className="block rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4 hover:border-indigo-600 hover:bg-zinc-900"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{v.name}</span>
                <span className="font-mono text-xs text-zinc-600">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <p className="mt-1 text-sm text-zinc-500">{v.vibe}</p>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full">
                {v.swatch.map((c) => (
                  <span key={c} className="flex-1" style={{ background: c }} />
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
