export default function AppLoading() {
  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="border-b border-gold/15 px-4 py-4">
        <div className="mx-auto h-5 max-w-7xl rounded bg-gold/20" />
      </div>
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
        <div className="h-3 w-48 rounded bg-zinc-800" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-40 rounded-2xl border border-gold/10 bg-zinc-950" />
          <div className="h-40 rounded-2xl border border-gold/10 bg-zinc-950" />
        </div>
      </div>
    </div>
  );
}
