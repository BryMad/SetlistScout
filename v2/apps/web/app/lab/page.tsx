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
        The real site, reskinned — header search, Predict my set / Relive a set, the Auto / Latest
        tour / Last 60 shows pills (all clickable), confidence panel, legend, and the track list,
        running on dummy data. The Spotify elements are identical and untouched in all ten per the
        branding guidelines; everything else changes. Use the pill at the bottom of each page to
        flip through.
      </p>

      {[
        { title: "Motion family — the direction", items: VARIANTS.filter((v) => v.slug.startsWith("motion")) },
        { title: "The field", items: VARIANTS.filter((v) => !v.slug.startsWith("motion")) },
      ].map((group) => (
        <section key={group.title} className="mt-8">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">{group.title}</h2>
          <ol className="mt-3 grid gap-3 sm:grid-cols-2">
            {group.items.map((v) => (
              <li key={v.slug}>
                <Link
                  href={`/lab/${v.slug}`}
                  className="block rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4 hover:border-indigo-600 hover:bg-zinc-900"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">{v.name}</span>
                    <span className="font-mono text-xs text-zinc-600">
                      {String(VARIANTS.indexOf(v) + 1).padStart(2, "0")}
                    </span>
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
        </section>
      ))}
    </main>
  );
}
