export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 max-w-screen-xl mx-auto">
      {/* Greeting */}
      <div>
        <div className="h-8 w-40 rounded bg-zinc-200 animate-pulse" />
        <div className="h-4 w-56 rounded bg-zinc-100 animate-pulse mt-2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Completeness card */}
        <div className="h-72 rounded-2xl bg-zinc-100 animate-pulse" />

        {/* Stats + Activity */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <div className="h-40 rounded-2xl bg-zinc-100 animate-pulse" />
          <div className="h-40 rounded-2xl bg-zinc-100 animate-pulse" />
        </div>
      </div>

      <div className="h-10 w-32 rounded-xl bg-zinc-100 animate-pulse" />
    </div>
  );
}
