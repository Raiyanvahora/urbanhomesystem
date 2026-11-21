import { useMemo, useState } from 'react';
import { BookingForm } from '../components/BookingForm';
import { Badge, btnPrimary, Card, ErrorBanner, inputCls, Modal, PageHeader, paymentTone, statusTone } from '../components/ui';
import { bookingPaymentStatus, paidByBooking } from '../lib/summary';
import { formatDate, formatINR, errorMessage } from '../lib/format';
import { deleteBooking } from '../lib/api';
import { BOOKING_STATUSES, type Booking, type BusinessData } from '../lib/types';

interface Props {
  data: BusinessData;
  showFinancials: boolean;
  onChanged: () => void;
}

export function Bookings({ data, showFinancials, onChanged }: Props) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [editing, setEditing] = useState<Booking | 'new' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function onDelete(b: Booking) {
    const paymentCount = data.payments.filter((p) => p.booking_id === b.id).length;
    const warning = paymentCount ? `\n\nIts ${paymentCount} payment record(s) will also be deleted.` : '';
    if (!window.confirm(`Delete the booking for ${b.customer_name}?${warning}\n\nThis cannot be undone.`)) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteBooking(b.id);
      setEditing(null);
      onChanged();
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const paid = useMemo(() => paidByBooking(data), [data]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = search.replace(/\D/g, '');
    return data.bookings
      .filter((b) => {
        if (q) {
          const nameHit = b.customer_name.toLowerCase().includes(q);
          const phoneHit = digits.length > 0 && b.phone.replace(/\D/g, '').includes(digits);
          if (!nameHit && !phoneHit) return false;
        }
        if (status && b.status !== status) return false;
        if (from && b.booking_date < from) return false;
        if (to && b.booking_date > to) return false;
        return true;
      })
      .sort((a, b) => b.booking_date.localeCompare(a.booking_date));
  }, [data, search, status, from, to]);

  const hasFilters = search || status || from || to;

  const newButton = (
    <button className={btnPrimary} onClick={() => setEditing('new')}>+ New booking</button>
  );

  return (
    <>
      <PageHeader title="Bookings" subtitle={`${data.bookings.length} total · showing ${rows.length}`} action={<div className="hidden md:block">{newButton}</div>} />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input className={`${inputCls} lg:col-span-2`} placeholder="Search name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {BOOKING_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input className={inputCls} type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className={inputCls} type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {hasFilters && (
          <button className="mt-3 text-sm font-medium text-brand-700 hover:underline" onClick={() => { setSearch(''); setStatus(''); setFrom(''); setTo(''); }}>
            Clear filters
          </button>
        )}
      </Card>

      {rows.length === 0 ? (
        <Card><p className="text-center text-sm text-slate-500">No bookings match these filters.</p></Card>
      ) : (
        <>
          {/* Desktop / tablet table */}
          <Card className="hidden overflow-x-auto p-0 md:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Area</th>
                  <th className="px-4 py-3 font-semibold">Service</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  {showFinancials && <th className="px-4 py-3 font-semibold">Price</th>}
                  <th className="px-4 py-3 font-semibold">Booking</th>
                  {showFinancials && <th className="px-4 py-3 font-semibold">Payment</th>}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((b) => {
                  const ps = bookingPaymentStatus(b, paid.get(b.id) ?? 0);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-800">{b.customer_name}</td>
                      <td className="px-4 py-3 text-slate-600">{b.phone}</td>
                      <td className="px-4 py-3 text-slate-600">{b.area}</td>
                      <td className="px-4 py-3 text-slate-600">{b.service}<div className="text-xs text-slate-400">{b.sofa_size}</div></td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatDate(b.booking_date)}<div className="text-xs text-slate-400">{b.preferred_time}</div></td>
                      {showFinancials && <td className="px-4 py-3 font-semibold text-slate-800">{formatINR(b.price)}</td>}
                      <td className="px-4 py-3"><Badge tone={statusTone(b.status)}>{b.status}</Badge></td>
                      {showFinancials && <td className="px-4 py-3"><Badge tone={paymentTone(ps)}>{ps}</Badge></td>}
                      <td className="px-4 py-3 text-right">
                        <button className="font-medium text-brand-700 hover:underline" onClick={() => setEditing(b)}>Edit</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {rows.map((b) => {
              const ps = bookingPaymentStatus(b, paid.get(b.id) ?? 0);
              return (
                <Card key={b.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900">{b.customer_name}</div>
                      <a className="text-sm text-brand-700" href={`tel:${b.phone}`}>{b.phone}</a>
                    </div>
                    <Badge tone={statusTone(b.status)}>{b.status}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <span>{formatDate(b.booking_date)} · {b.preferred_time}</span>
                    <span>{b.area} · {b.sofa_size}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    {showFinancials ? (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{formatINR(b.price)}</span>
                        <Badge tone={paymentTone(ps)}>{ps}</Badge>
                      </div>
                    ) : <span />}
                    <button className="text-sm font-medium text-brand-700" onClick={() => setEditing(b)}>Edit</button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Mobile floating action button */}
      <button
        onClick={() => setEditing('new')}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-3xl text-white shadow-lg md:hidden"
        aria-label="New booking"
      >
        +
      </button>

      <Modal
        open={editing !== null}
        title={editing === 'new' || editing === null ? 'New booking' : 'Edit booking'}
        onClose={() => setEditing(null)}
      >
        {editing !== null && (
          <>
            <BookingForm
              key={editing === 'new' ? 'new' : editing.id}
              initial={editing === 'new' ? undefined : editing}
              showPrice={showFinancials}
              onCancel={() => setEditing(null)}
              onSaved={() => { setEditing(null); onChanged(); }}
            />
            {editing !== 'new' && (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <ErrorBanner message={deleteError} />
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void onDelete(editing)}
                  className="mt-2 text-sm font-semibold text-rose-600 hover:underline disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Delete this booking'}
                </button>
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
