export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
      <p className="mt-6 text-zinc-400">Pulling this tour&apos;s setlists…</p>
    </main>
  );
}
