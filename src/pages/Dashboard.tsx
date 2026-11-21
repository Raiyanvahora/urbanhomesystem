import { Card, PageHeader, Badge, statusTone } from '../components/ui';
import { computeSummary } from '../lib/summary';
import { formatDate, formatINR, todayISO } from '../lib/format';
import { BOOKING_STATUSES, type BusinessData } from '../lib/types';

// Set to false to hide the optional estimated profit card.
const SHOW_PROFIT_CARD = true;

interface Props {
  data: BusinessData;
  showFinancials: boolean;
  onNavigate: (page: 'bookings' | 'payments' | 'expenses') => void;
}

export function Dashboard({ data, showFinancials, onNavigate }: Props) {
  const s = computeSummary(data);
  const today = todayISO();
  const upcoming = data.bookings
    .filter((b) => b.booking_date >= today && b.status !== 'Completed' && b.status !== 'Cancelled')
    .sort((a, b) => a.booking_date.localeCompare(b.booking_date) || a.preferred_time.localeCompare(b.preferred_time))
    .slice(0, 5);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Bookings, collections and costs at a glance." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total bookings" value={String(s.totalBookings)} sub="Excluding cancelled" />
        <Stat label="Completed jobs" value={String(s.completedJobs)} sub="Includes starting count" />
        {showFinancials && (
          <>
            <Stat label="Revenue collected" value={formatINR(s.revenue)} sub="Paid payments only" tone="blue" />
            <Stat label="Total expenses" value={formatINR(s.operatingExpenses)} sub={`Assets ${formatINR(s.capitalAssets)} separate`} tone="rose" />
          </>
        )}
      </div>

      {showFinancials && SHOW_PROFIT_CARD && (
        <Card className="mt-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-500">Estimated profit</div>
              <div className={`mt-1 text-3xl font-bold ${s.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatINR(s.profit)}
              </div>
              <div className="mt-1 text-xs text-slate-400">Collected revenue minus operating expenses</div>
            </div>
            {s.costsIncomplete ? (
              <div className="max-w-xs rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
                <div className="font-semibold">Costs may be incomplete</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                  {s.missingCosts.map((m) => <li key={m}>{m}</li>)}
                </ul>
                <button onClick={() => onNavigate('expenses')} className="mt-2 text-xs font-semibold text-amber-900 underline">
                  Add an expense
                </button>
              </div>
            ) : (
              <Badge tone="emerald">Costs recorded</Badge>
            )}
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Booking pipeline</h2>
            <button onClick={() => onNavigate('bookings')} className="text-sm font-medium text-brand-700 hover:underline">View all</button>
          </div>
          <div className="space-y-3">
            {BOOKING_STATUSES.map((st) => {
              const count = s.statusCounts[st];
              const pct = data.bookings.length ? Math.round((count / data.bookings.length) * 100) : 0;
              return (
                <div key={st}>
                  <div className="mb-1 flex justify-between text-sm">
                    <Badge tone={statusTone(st)}>{st}</Badge>
                    <span className="font-semibold text-slate-700">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">Upcoming jobs</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming bookings. Add one from the Bookings page.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-800">{b.customer_name}</div>
                    <div className="truncate text-xs text-slate-500">
                      {formatDate(b.booking_date)} · {b.preferred_time} · {b.area}
                    </div>
                  </div>
                  <Badge tone={statusTone(b.status)}>{b.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value, sub, tone = 'slate' }: { label: string; value: string; sub: string; tone?: 'slate' | 'blue' | 'rose' }) {
  const valueCls = { slate: 'text-slate-900', blue: 'text-brand-700', rose: 'text-rose-600' }[tone];
  return (
    <Card>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-2 break-words text-2xl font-bold sm:text-3xl ${valueCls}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-400">{sub}</div>
    </Card>
  );
}
