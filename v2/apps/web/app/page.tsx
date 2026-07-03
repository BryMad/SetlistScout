import ArtistSearch from "@/components/ArtistSearch";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-6 pt-[22vh]">
      <h1 className="text-4xl font-semibold tracking-tight">Setlist Scout</h1>
      <p className="mt-3 text-center text-zinc-400">
        Know the setlist before the show.
      </p>

      <div className="mt-10 w-full">
        <ArtistSearch variant="hero" autoFocus />
      </div>
    </main>
  );
}
