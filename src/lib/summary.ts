import { BOOKING_STATUSES, type Booking, type BookingStatus, type BusinessData, type ExpenseCategory } from './types';

// Cost categories the business normally has. If none is recorded, profit is flagged as incomplete.
const EXPECTED_COST_CATEGORIES: ExpenseCategory[] = ['Fuel', 'Chemicals', 'Meta Ads'];

export type BookingPaymentStatus = 'Paid' | 'Partial' | 'Unpaid';

/** Sum of PAID payments per booking. Unpaid payment rows never count as revenue. */
export function paidByBooking(data: BusinessData): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of data.payments) {
    if (p.status !== 'Paid') continue;
    map.set(p.booking_id, (map.get(p.booking_id) ?? 0) + Number(p.amount));
  }
  return map;
}

export function bookingPaymentStatus(booking: Booking, paid: number): BookingPaymentStatus {
  if (paid > 0 && paid >= Number(booking.price)) return 'Paid';
  if (paid > 0) return 'Partial';
  return 'Unpaid';
}

const sum = (values: number[]) => values.reduce((s, v) => s + v, 0);

export function computeSummary(data: BusinessData) {
  const openingTotal = (kind: 'jobs' | 'revenue' | 'expense' | 'asset') =>
    sum(data.openingBalances.filter((o) => o.kind === kind).map((o) => Number(o.amount)));

  const cancelled = data.bookings.filter((b) => b.status === 'Cancelled').length;
  const completedBookings = data.bookings.filter((b) => b.status === 'Completed').length;

  const totalBookings = data.bookings.length - cancelled;
  const completedJobs = completedBookings + openingTotal('jobs');

  const revenue =
    sum(data.payments.filter((p) => p.status === 'Paid').map((p) => Number(p.amount))) +
    openingTotal('revenue');

  const operatingExpenses =
    sum(data.expenses.filter((e) => !e.is_capital_asset).map((e) => Number(e.amount))) +
    openingTotal('expense');

  const capitalAssets =
    sum(data.expenses.filter((e) => e.is_capital_asset).map((e) => Number(e.amount))) +
    openingTotal('asset');

  const recorded = new Set<string | null>([
    ...data.expenses.map((e) => e.category),
    ...data.openingBalances.map((o) => o.category),
  ]);
  const missingCosts = EXPECTED_COST_CATEGORIES.filter((c) => !recorded.has(c)).map(
    (c) => `No ${c} cost recorded yet`,
  );

  const statusCounts = Object.fromEntries(
    BOOKING_STATUSES.map((s) => [s, data.bookings.filter((b) => b.status === s).length]),
  ) as Record<BookingStatus, number>;

  return {
    totalBookings,
    completedJobs,
    revenue,
    operatingExpenses,
    capitalAssets,
    profit: revenue - operatingExpenses,
    missingCosts,
    costsIncomplete: missingCosts.length > 0,
    statusCounts,
  };
}
