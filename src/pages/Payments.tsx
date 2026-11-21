import { useMemo, useState, type FormEvent } from 'react';
import { addPayment, setPaymentStatus } from '../lib/api';
import { errorMessage, formatDate, formatINR, todayISO } from '../lib/format';
import { paidByBooking } from '../lib/summary';
import { Badge, btnPrimary, Card, ErrorBanner, Field, inputCls, PageHeader, paymentTone } from '../components/ui';
import { PAYMENT_METHODS, PAYMENT_STATUSES, type BusinessData, type PaymentMethod, type PaymentStatus } from '../lib/types';

interface Props {
  data: BusinessData;
  onChanged: () => void;
}

export function Payments({ data, onChanged }: Props) {
  const bookingsById = useMemo(() => new Map(data.bookings.map((b) => [b.id, b])), [data.bookings]);
  const paid = useMemo(() => paidByBooking(data), [data]);
  const activeBookings = data.bookings.filter((b) => b.status !== 'Cancelled');

  const [bookingId, setBookingId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState<PaymentStatus>('Paid');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = bookingId ? bookingsById.get(bookingId) : undefined;
  const balance = selected ? Math.max(0, Number(selected.price) - (paid.get(selected.id) ?? 0)) : null;

  const received = data.payments.filter((p) => p.status === 'Paid').reduce((s, p) => s + Number(p.amount), 0);
  const unpaid = data.payments.filter((p) => p.status === 'Unpaid').reduce((s, p) => s + Number(p.amount), 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const value = Number(amount);
    if (!bookingId) return setError('Choose a booking.');
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount greater than zero.');
    setSaving(true);
    try {
      await addPayment({ booking_id: bookingId, amount: value, method, payment_date: date, status });
      setAmount('');
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, next: PaymentStatus) {
    try {
      await setPaymentStatus(id, next);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader title="Payments" subtitle="Only payments marked Paid count toward revenue." />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Received (counts as revenue)</div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{formatINR(received)}</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recorded as unpaid</div>
          <div className="mt-2 text-2xl font-bold text-rose-600">{formatINR(unpaid)}</div>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="mb-4 font-semibold text-slate-900">Record a payment</h2>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Booking" hint={balance !== null ? `Balance due on this booking: ${formatINR(balance)}` : undefined}>
              <select className={inputCls} required value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
                <option value="">Select a booking…</option>
                {activeBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.customer_name} · {formatDate(b.booking_date)} · {formatINR(b.price)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Amount received (₹)">
            <input className={inputCls} type="number" min="0.01" step="0.01" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Payment method">
            <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Payment date">
            <input className={inputCls} type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Status">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)}>
              {PAYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2"><ErrorBanner message={error} /></div>
          <div className="sm:col-span-2 sm:flex sm:justify-end">
            <button className={`${btnPrimary} w-full sm:w-auto`} disabled={saving}>{saving ? 'Saving…' : 'Save payment'}</button>
          </div>
        </form>
      </Card>

      <Card className="mt-4 p-0">
        <div className="border-b border-slate-100 px-5 py-4 font-semibold text-slate-900">Payment history</div>
        {data.payments.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No payments recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.payments.map((p) => {
              const b = bookingsById.get(p.booking_id);
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-800">{b?.customer_name ?? 'Deleted booking'}</div>
                    <div className="text-xs text-slate-500">{formatDate(p.payment_date)} · {p.method}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-800">{formatINR(p.amount)}</span>
                    <select
                      aria-label="Payment status"
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                      value={p.status}
                      onChange={(e) => void changeStatus(p.id, e.target.value as PaymentStatus)}
                    >
                      {PAYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <Badge tone={paymentTone(p.status)}>{p.status}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
