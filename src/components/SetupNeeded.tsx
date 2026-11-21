export function SetupNeeded() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
        <h1 className="text-xl font-bold text-slate-900">One setup step left</h1>
        <p className="text-sm text-slate-600">
          The app needs your Supabase keys before it can start. In the project folder:
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>Copy <code className="rounded bg-slate-100 px-1">.env.example</code> to <code className="rounded bg-slate-100 px-1">.env.local</code></li>
          <li>Fill in <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code> and <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_ANON_KEY</code> (Supabase → Project Settings → API, anon public key)</li>
          <li>Restart <code className="rounded bg-slate-100 px-1">npm run dev</code> and reload this page</li>
        </ol>
      </div>
    </div>
  );
}
