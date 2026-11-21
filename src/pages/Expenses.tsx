import { useMemo, useState, type FormEvent } from 'react';
import { addExpense, deleteExpense } from '../lib/api';
import { errorMessage, formatDate, formatINR, todayISO } from '../lib/format';
import { Badge, btnPrimary, Card, ErrorBanner, Field, inputCls, PageHeader } from '../components/ui';
import { computeSummary } from '../lib/summary';
import { EXPENSE_CATEGORIES, PAID_BY, type BusinessData, type ExpenseCategory, type PaidBy } from '../lib/types';

interface Props {
  data: BusinessData;
  onChanged: () => void;
}

export function Expenses({ data, onChanged }: Props) {
  const summary = computeSummary(data);
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState<ExpenseCategory>('Fuel');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<PaidBy>('Founder 1');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Operating expenses (excluding capital assets) and assets, shown separately.
  const operating = useMemo(() => data.expenses.filter((e) => !e.is_capital_asset), [data.expenses]);
  const assets = useMemo(() => data.expenses.filter((e) => e.is_capital_asset), [data.expenses]);
  const openingExpenseTotal = data.openingBalances
    .filter((o) => o.kind === 'expense')
    .reduce((s, o) => s + Number(o.amount), 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount greater than zero.');
    setSaving(true);
    try {
      await addExpense({
        expense_date: date,
        category,
        amount: value,
        paid_by: paidBy,
        notes: notes.trim() || null,
      });
      setAmount('');
      setNotes('');
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Expenses" subtitle="Equipment is tracked separately as a capital asset." />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Operating expenses</div>
          <div className="mt-2 text-2xl font-bold text-rose-600">{formatINR(summary.operatingExpenses)}</div>
          <div className="mt-1 text-xs text-slate-400">
            Used for estimated profit · includes starting totals of {formatINR(openingExpenseTotal)}
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Capital assets</div>
          <div className="mt-2 text-2xl font-bold text-brand-700">{formatINR(summary.capitalAssets)}</div>
          <div className="mt-1 text-xs text-slate-400">Equipment, not counted as running cost</div>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="mb-4 font-semibold text-slate-900">Add an expense</h2>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Date">
            <input className={inputCls} type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Category" hint={category === 'Equipment' ? 'Saved as a capital asset.' : undefined}>
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Amount (₹)">
            <input className={inputCls} type="number" min="0.01" step="0.01" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Paid by">
            <select className={inputCls} value={paidBy} onChange={(e) => setPaidBy(e.target.value as PaidBy)}>
              {PAID_BY.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Petrol for Bakrol trip" />
            </Field>
          </div>
          <div className="sm:col-span-2"><ErrorBanner message={error} /></div>
          <div className="sm:col-span-2 sm:flex sm:justify-end">
            <button className={`${btnPrimary} w-full sm:w-auto`} disabled={saving}>{saving ? 'Saving…' : 'Save expense'}</button>
          </div>
        </form>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ExpenseList title="Operating expenses" rows={operating} onDeleted={onChanged} />
        <ExpenseList title="Capital assets" rows={assets} onDeleted={onChanged} />
      </div>
    </>
  );
}

function ExpenseList({
  title,
  rows,
  onDeleted,
}: {
  title: string;
  rows: BusinessData['expenses'];
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string, label: string) {
    if (!window.confirm(`Delete this ${label} expense?\n\nThis cannot be undone.`)) return;
    setError(null);
    try {
      await deleteExpense(id);
      onDeleted();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Card className="p-0">
      <div className="border-b border-slate-100 px-5 py-4 font-semibold text-slate-900">{title}</div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">Nothing recorded yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge tone="slate">{e.category}</Badge>
                  <span className="text-xs text-slate-500">{formatDate(e.expense_date)} · {e.paid_by}</span>
                </div>
                {e.notes && <div className="mt-1 truncate text-xs text-slate-500">{e.notes}</div>}
              </div>
              <div className="flex items-center gap-3">
                <span className="whitespace-nowrap font-semibold text-slate-800">{formatINR(e.amount)}</span>
                <button
                  type="button"
                  onClick={() => void remove(e.id, e.category)}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                  aria-label={`Delete ${e.category} expense`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <div className="px-5 pb-4"><ErrorBanner message={error} /></div>}
    </Card>
  );
}
