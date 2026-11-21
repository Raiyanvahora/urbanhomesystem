import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { canManageExpenses, canManagePayments, canViewFinancials, type Role } from '../lib/access';
import { useBusinessData } from '../hooks/useBusinessData';
import { Dashboard } from '../pages/Dashboard';
import { Bookings } from '../pages/Bookings';
import { Payments } from '../pages/Payments';
import { Expenses } from '../pages/Expenses';
import { btnGhost, ErrorBanner } from './ui';

type Page = 'dashboard' | 'bookings' | 'payments' | 'expenses';

// `financial` pages are hidden for roles without financial access (technicians later).
const NAV: { id: Page; label: string; glyph: string; financial: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', glyph: '◉', financial: false },
  { id: 'bookings', label: 'Bookings', glyph: '≡', financial: false },
  { id: 'payments', label: 'Payments', glyph: '₹', financial: true },
  { id: 'expenses', label: 'Expenses', glyph: '↗', financial: true },
];

export function AppShell({ role, email }: { role: Role; email: string }) {
  const [page, setPage] = useState<Page>('dashboard');
  const { data, error, loading, reload } = useBusinessData();
  const financial = canViewFinancials(role);
  const nav = NAV.filter((n) => !n.financial || financial);

  const renderPage = () => {
    if (!data) return null;
    switch (page) {
      case 'dashboard':
        return <Dashboard data={data} showFinancials={financial} onNavigate={setPage} />;
      case 'bookings':
        return <Bookings data={data} showFinancials={financial} onChanged={reload} />;
      case 'payments':
        return canManagePayments(role) ? <Payments data={data} onChanged={reload} /> : null;
      case 'expenses':
        return canManageExpenses(role) ? <Expenses data={data} onChanged={reload} /> : null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 font-bold text-white">UH</div>
          <div>
            <div className="text-sm font-bold text-slate-900">Urban Home Care</div>
            <div className="text-xs text-slate-500">Founders</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                page === n.id ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="w-5 text-center text-base">{n.glyph}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-4">
          <div className="truncate text-xs text-slate-500">{email}</div>
          <button onClick={() => supabase.auth.signOut()} className="mt-2 text-sm font-medium text-brand-700 hover:underline">
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">UH</div>
          <span className="text-sm font-bold text-slate-900">Urban Home Care</span>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-sm font-medium text-brand-700">
          Sign out
        </button>
      </header>

      <main className="px-4 pb-28 pt-6 sm:px-6 md:ml-60 md:px-10 md:pb-10 md:pt-10">
        <div className="mx-auto max-w-6xl">
          {error && (
            <div className="mb-6 space-y-3">
              <ErrorBanner message={error} />
              <button className={btnGhost} onClick={() => void reload()}>Retry</button>
            </div>
          )}
          {loading && !data && <p className="text-sm text-slate-500">Loading records…</p>}
          {renderPage()}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0,1fr))` }}
      >
        {nav.map((n) => (
          <button
            key={n.id}
            onClick={() => setPage(n.id)}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${page === n.id ? 'text-brand-700' : 'text-slate-500'}`}
          >
            <span className="text-base leading-none">{n.glyph}</span>
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
