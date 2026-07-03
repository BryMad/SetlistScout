"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ArtistSearch from "./ArtistSearch";

/** Always-available top bar: logo home link + artist search on every page. */
export default function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-6">
        <Link href="/" className="shrink-0 text-base font-semibold tracking-tight">
          Setlist Scout
        </Link>
        {!isHome && <ArtistSearch variant="header" />}
      </div>
    </header>
  );
}
