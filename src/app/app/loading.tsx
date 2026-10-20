export default function AppLoading() {
  return (
    <div className="relative min-h-screen lg:pl-64">
      <div className="mx-auto max-w-6xl space-y-4 px-5 pb-10 pt-24 lg:px-10 lg:pt-12">
        <div className="h-3 w-48 animate-pulse bg-signal/25" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="peakpro-panel h-40 animate-pulse" />
          <div className="peakpro-panel h-40 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
