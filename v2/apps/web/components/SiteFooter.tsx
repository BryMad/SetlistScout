/** Attribution footer, ported from the old site: Spotify + setlist.fm logos
 *  and the disclaimer Spotify's developer terms require. */
export default function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-zinc-800/70 px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-10 sm:flex-row sm:items-start sm:justify-center sm:gap-20">
        <a
          href="https://open.spotify.com"
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center gap-3"
        >
          <span className="text-xs text-zinc-500">
            artist search, track lookup, and playlist creation powered by:
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/spotify-logo-green.png" alt="Spotify" className="w-[160px]" />
        </a>
        <a
          href="https://www.setlist.fm"
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center gap-3"
        >
          <span className="text-xs text-zinc-500">
            setlist and tour data powered by:
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/setlistfm-logo.png" alt="setlist.fm" className="w-[200px]" />
        </a>
      </div>
      <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-relaxed text-zinc-600">
        This app uses the Spotify API but is not endorsed, certified, or otherwise
        approved by Spotify. Spotify is a registered trademark of Spotify AB. See the{" "}
        <a
          href="https://developer.spotify.com/policy"
          target="_blank"
          rel="noreferrer"
          className="text-zinc-500 hover:text-zinc-300"
        >
          Spotify Developer Policy
        </a>{" "}
        and{" "}
        <a
          href="https://developer.spotify.com/documentation/design"
          target="_blank"
          rel="noreferrer"
          className="text-zinc-500 hover:text-zinc-300"
        >
          Brand Guidelines
        </a>{" "}
        for more info. ·{" "}
        <a href="/legal" className="text-zinc-500 hover:text-zinc-300">
          Privacy &amp; Terms
        </a>
      </p>
    </footer>
  );
}
