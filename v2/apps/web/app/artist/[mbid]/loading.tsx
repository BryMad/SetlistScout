export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
      <p className="mt-6 text-zinc-400">
        Fetching recent shows from setlist.fm…
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        Up to 100 shows, politely rate-limited — takes a few seconds.
      </p>
    </main>
  );
}
