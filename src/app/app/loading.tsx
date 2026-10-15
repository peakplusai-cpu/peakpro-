export default function AppLoading() {
  return (
    <div className="relative min-h-screen text-zinc-100">
      <div className="border-b border-phosphor/10 px-4 py-4">
        <div className="mx-auto h-5 max-w-7xl bg-phosphor/15" />
      </div>
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
        <div className="h-3 w-48 bg-zinc-800" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="peakpro-panel h-40" />
          <div className="peakpro-panel h-40" />
        </div>
      </div>
    </div>
  );
}
