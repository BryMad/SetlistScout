import ArtistSearch from "@/components/ArtistSearch";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-6 pt-[22vh]">
      <h1 className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text font-display text-4xl font-bold uppercase tracking-[0.12em] text-transparent drop-shadow-[0_0_18px_rgba(99,102,241,0.4)]">
        Setlist Scout
      </h1>
      <p className="mt-3 text-center text-zinc-400">
        Know the setlist before the show.
      </p>

      <div className="mt-10 w-full">
        <ArtistSearch variant="hero" autoFocus />
      </div>
    </main>
  );
}
