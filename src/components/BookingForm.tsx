import { useState, type FormEvent } from 'react';
import { saveBooking } from '../lib/api';
import { errorMessage, todayISO } from '../lib/format';
import {
  AREAS,
  BOOKING_STATUSES,
  SERVICE_NAME,
  SOFA_SIZES,
  TIME_SLOTS,
  type Booking,
  type BookingInput,
  type BookingStatus,
} from '../lib/types';
import { btnGhost, btnPrimary, ErrorBanner, Field, inputCls } from './ui';

interface FormState {
  customer_name: string;
  phone: string;
  area: string;
  address: string;
  sofa_size: string;
  booking_date: string;
  preferred_time: string;
  price: string;
  notes: string;
  status: BookingStatus;
}

const emptyForm = (): FormState => ({
  customer_name: '',
  phone: '',
  area: AREAS[0],
  address: '',
  sofa_size: SOFA_SIZES[0],
  booking_date: todayISO(),
  preferred_time: TIME_SLOTS[0],
  price: '',
  notes: '',
  status: 'New',
});

const toForm = (b: Booking): FormState => ({
  customer_name: b.customer_name,
  phone: b.phone,
  area: b.area,
  address: b.address,
  sofa_size: b.sofa_size,
  booking_date: b.booking_date,
  preferred_time: b.preferred_time,
  price: String(b.price),
  notes: b.notes ?? '',
  status: b.status,
});

interface Props {
  initial?: Booking;
  showPrice: boolean;
  onSaved: () => void;
  onCancel: () => void;
}

export function BookingForm({ initial, showPrice, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(() => (initial ? toForm(initial) : emptyForm()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const digits = form.phone.replace(/\D/g, '');
    const price = form.price.trim() === '' ? 0 : Number(form.price);
    if (digits.length < 10) return setError('Enter a valid 10-digit mobile number.');
    if (!Number.isFinite(price) || price < 0) return setError('Price must be a positive amount.');

    const payload: BookingInput = {
      customer_name: form.customer_name.trim(),
      phone: digits.slice(-10),
      area: form.area as BookingInput['area'],
      address: form.address.trim(),
      sofa_size: form.sofa_size as BookingInput['sofa_size'],
      service: SERVICE_NAME,
      booking_date: form.booking_date,
      preferred_time: form.preferred_time,
      // When the user cannot see financials, keep the stored price unchanged.
      price: showPrice ? price : (initial?.price ?? 0),
      notes: form.notes.trim() || null,
      status: form.status,
    };

    setSaving(true);
    try {
      await saveBooking(payload, initial?.id);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Customer name">
        <input className={inputCls} required value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} />
      </Field>
      <Field label="Mobile number">
        <input className={inputCls} type="tel" inputMode="tel" required placeholder="98765 43210" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
      </Field>
      <Field label="Area">
        <select className={inputCls} value={form.area} onChange={(e) => set('area', e.target.value)}>
          {AREAS.map((a) => <option key={a}>{a}</option>)}
        </select>
      </Field>
      <Field label="Sofa size">
        <select className={inputCls} value={form.sofa_size} onChange={(e) => set('sofa_size', e.target.value)}>
          {SOFA_SIZES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Complete address">
          <textarea className={inputCls} rows={2} required value={form.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
      </div>
      <Field label="Booking date">
        <input className={inputCls} type="date" required value={form.booking_date} onChange={(e) => set('booking_date', e.target.value)} />
      </Field>
      <Field label="Preferred time">
        <select className={inputCls} value={form.preferred_time} onChange={(e) => set('preferred_time', e.target.value)}>
          {TIME_SLOTS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Status">
        <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value as BookingStatus)}>
          {BOOKING_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      {showPrice && (
        <Field label="Total price (₹)" hint="Enter the agreed job price.">
          <input className={inputCls} type="number" min="0" step="0.01" inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value)} />
        </Field>
      )}
      <div className="sm:col-span-2">
        <Field label="Notes">
          <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>

      <div className="sm:col-span-2">
        <ErrorBanner message={error} />
      </div>
      <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
        <button type="button" className={btnGhost} onClick={onCancel}>Cancel</button>
        <button className={btnPrimary} disabled={saving}>{saving ? 'Saving…' : initial ? 'Save changes' : 'Create booking'}</button>
      </div>
    </form>
  );
}
