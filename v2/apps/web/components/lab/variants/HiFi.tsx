import { LAB, TRACKS, BAND_LABEL } from "../data";

/* 02 · SILVER FACE — 1970s Japanese hi-fi receiver skeuomorphism. Brushed
   aluminum faceplate, wood cabinet, phosphor-lit display windows, VU needles,
   3D transport buttons. Spotify zones stay canonical. */

export default function HiFi() {
  return (
    <div className="hf min-h-screen bg-[#17120d] px-4 py-12 font-sans" style={{ fontFamily: "var(--font-geist-sans)" }}>
      <style>{`
        .hf-cabinet {
          background: linear-gradient(90deg, #4a2f1b, #6b4423 8%, #59371d 12%, #6b4423 88%, #4a2f1b);
          border-radius: 10px; padding: 14px;
          box-shadow: 0 30px 60px rgba(0,0,0,.6), inset 0 2px 2px rgba(255,255,255,.15);
        }
        .hf-face {
          background:
            repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 3px),
            linear-gradient(180deg, #d9d9d6, #bcbcb8 45%, #cacac6 55%, #a9a9a5);
          border-radius: 6px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.9), inset 0 -2px 4px rgba(0,0,0,.35);
        }
        .hf-display {
          background: linear-gradient(180deg, #030c09, #08170f);
          border-radius: 4px;
          box-shadow: inset 0 2px 8px rgba(0,0,0,.9), inset 0 0 30px rgba(0,255,170,.06), 0 1px 0 rgba(255,255,255,.7);
        }
        .hf-phosphor { color: #6ff7c0; text-shadow: 0 0 6px rgba(111,247,192,.8), 0 0 18px rgba(111,247,192,.35); }
        .hf-phosphor-blue { color: #7fd4ff; text-shadow: 0 0 6px rgba(127,212,255,.8), 0 0 18px rgba(127,212,255,.35); }
        .hf-engraved { color: #3a3a38; text-shadow: 0 1px 0 rgba(255,255,255,.7); }
        .hf-knob {
          width: 52px; height: 52px; border-radius: 999px;
          background: radial-gradient(circle at 35% 30%, #f2f2ef, #b9b9b5 55%, #8f8f8b);
          box-shadow: 0 3px 6px rgba(0,0,0,.45), inset 0 1px 1px rgba(255,255,255,.9), inset 0 -2px 3px rgba(0,0,0,.3);
          position: relative;
        }
        .hf-knob::after { content: ""; position: absolute; left: 50%; top: 5px; width: 2px; height: 14px; background: #2b2b29; transform: translateX(-50%); border-radius: 2px; }
        .hf-btn3d {
          background: linear-gradient(180deg, #efefec, #c9c9c5 48%, #b3b3af 52%, #d4d4d0);
          border: 1px solid #8e8e8a; border-radius: 4px;
          box-shadow: 0 3px 0 #7e7e7a, 0 4px 6px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.9);
        }
        .hf-btn3d:active { transform: translateY(2px); box-shadow: 0 1px 0 #7e7e7a, inset 0 1px 0 rgba(255,255,255,.9); }
        .hf-vu {
          width: 76px; height: 44px; border-radius: 4px 4px 2px 2px; position: relative; overflow: hidden;
          background: linear-gradient(180deg, #f7efd8, #ecdfbc);
          box-shadow: inset 0 1px 4px rgba(0,0,0,.45), 0 1px 0 rgba(255,255,255,.6);
        }
        .hf-vu::before {
          content: ""; position: absolute; inset: 6px 6px 14px;
          border-top: 2px solid #6b5c39; border-radius: 50% 50% 0 0 / 100% 100% 0 0;
        }
        .hf-vu-red { position: absolute; top: 4px; right: 8px; width: 18px; height: 8px; border-top: 3px solid #c23b22; border-radius: 0 60% 0 0; }
        .hf-needle {
          position: absolute; left: 50%; bottom: 8px; width: 2px; height: 30px;
          background: #1e1c18; transform-origin: bottom center; border-radius: 1px;
          transition: transform .6s cubic-bezier(.2,.9,.3,1.2);
        }
        .hf-screw { width: 10px; height: 10px; border-radius: 999px; background: radial-gradient(circle at 35% 30%, #e8e8e5, #9a9a96); box-shadow: inset 0 1px 2px rgba(0,0,0,.5); position: relative; }
        .hf-screw::after { content: ""; position: absolute; left: 1px; right: 1px; top: 50%; height: 1px; background: #55554f; transform: rotate(35deg); }
      `}</style>

      <main className="mx-auto max-w-3xl">
        <div className="hf-cabinet">
          <div className="hf-face p-5">
            {/* top rail: brand + screws */}
            <div className="flex items-center justify-between">
              <div className="hf-screw" />
              <p className="hf-engraved text-[11px] font-semibold uppercase tracking-[0.35em]">
                Setlist Scout · Model SS-2600 · Stereo Setlist Tuner
              </p>
              <div className="hf-screw" />
            </div>

            {/* main display window */}
            <div className="hf-display mt-4 px-5 py-4 font-mono">
              <p className="hf-phosphor-blue text-[11px] uppercase tracking-[0.25em]">Tuned — FM 104.2</p>
              <p className="hf-phosphor mt-1 text-2xl font-semibold tracking-wide">{LAB.artist.toUpperCase()}</p>
              <p className="hf-phosphor text-sm opacity-90">
                {LAB.tour} · {LAB.shows} shows · ~{LAB.setLength} songs a night
              </p>
            </div>

            {/* control row */}
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-5">
                <div className="text-center">
                  <div className="hf-knob" />
                  <p className="hf-engraved mt-1 text-[9px] uppercase tracking-widest">Tuning</p>
                </div>
                <div className="text-center">
                  <div className="hf-knob" style={{ transform: "rotate(120deg)" }} />
                  <p className="hf-engraved mt-1 text-[9px] uppercase tracking-widest">Volume</p>
                </div>
                <div className="hidden gap-1 sm:flex">
                  {["POWER", "FM", "AM", "TAPE"].map((b) => (
                    <button key={b} className="hf-btn3d hf-engraved px-3 py-2 text-[9px] font-bold tracking-widest">
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <button className="rounded-full bg-[#1DB954] px-5 py-2 text-sm font-semibold text-white hover:brightness-110">
                Save {TRACKS.filter((t) => t.matched).length} songs as Spotify playlist
              </button>
            </div>

            {/* track modules */}
            <ol className="mt-5 space-y-2">
              {TRACKS.map((t) => (
                <li
                  key={t.rank}
                  className="grid grid-cols-[4rem_1fr_auto_auto] items-center gap-4 rounded-md border border-[#98989425] bg-[#ffffff2e] px-3 py-2"
                  style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.6), 0 1px 2px rgba(0,0,0,.15)" }}
                >
                  {/* Spotify zone: canonical art + stacked meta */}
                  {t.matched && t.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.cover} alt="" className="h-16 w-16 rounded object-cover" style={{ boxShadow: "0 0 0 3px #8f8f8b, inset 0 0 4px #000" }} />
                  ) : (
                    <div className="h-16 w-16 rounded bg-[#2b2b29]" style={{ boxShadow: "0 0 0 3px #8f8f8b" }} />
                  )}
                  <div className="min-w-0">
                    <p className="hf-engraved truncate text-sm font-bold">
                      {t.title}
                      {t.coverOf && <span className="ml-2 text-xs font-normal opacity-70">({t.coverOf} cover)</span>}
                    </p>
                    {t.matched && (
                      <>
                        <p className="hf-engraved truncate text-sm opacity-80">{t.artist}</p>
                        <p className="hf-engraved truncate text-xs opacity-60">{t.album}</p>
                      </>
                    )}
                  </div>
                  <div className="hidden flex-col items-center sm:flex">
                    <div className="hf-vu">
                      <div className="hf-vu-red" />
                      <div className="hf-needle" style={{ transform: `rotate(${-50 + t.pct}deg)` }} />
                    </div>
                    <p className="hf-engraved mt-0.5 text-[8px] uppercase tracking-widest">{BAND_LABEL(t.pct)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="hf-display hf-phosphor px-2 py-0.5 font-mono text-sm">{String(t.pct).padStart(3, "0")}%</span>
                    {t.matched ? (
                      <a className="rounded-full bg-[#1DB954] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white hover:brightness-110" href="#">
                        OPEN SPOTIFY
                      </a>
                    ) : (
                      <span className="hf-engraved rounded-full border border-[#8f8f8b] px-2.5 py-1 text-[10px] font-semibold tracking-wide opacity-60">
                        NO MATCH
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-4 flex items-center justify-between">
              <div className="hf-screw" />
              <p className="hf-engraved text-[9px] uppercase tracking-[0.3em]">Solid State · 40 Shows Analyzed · Made for the Front Row</p>
              <div className="hf-screw" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
