import { supabase } from './supabase';
import type { Role } from './access';
import type {
  BookingInput,
  BusinessData,
  Booking,
  Expense,
  ExpenseInput,
  OpeningBalance,
  Payment,
  PaymentInput,
  PaymentStatus,
} from './types';

function check<T extends { error: unknown }>(res: T): T {
  if (res.error) throw res.error;
  return res;
}

/** Returns 'founder' if the signed-in user has a founders row, otherwise null. */
export async function fetchRole(userId: string): Promise<Role | null> {
  const res = check(
    await supabase.from('founders').select('user_id').eq('user_id', userId).maybeSingle(),
  );
  return res.data ? 'founder' : null;
}

export async function fetchBusinessData(): Promise<BusinessData> {
  const [bookings, payments, expenses, openings] = await Promise.all([
    supabase.from('bookings').select('*').order('booking_date', { ascending: false }),
    supabase.from('payments').select('*').order('payment_date', { ascending: false }),
    supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
    supabase.from('opening_balances').select('*').order('created_at', { ascending: true }),
  ]);
  check(bookings);
  check(payments);
  check(expenses);
  check(openings);

  return {
    bookings: (bookings.data ?? []) as Booking[],
    payments: (payments.data ?? []) as Payment[],
    expenses: (expenses.data ?? []) as Expense[],
    openingBalances: (openings.data ?? []) as OpeningBalance[],
  };
}

export async function saveBooking(input: BookingInput, id?: string): Promise<void> {
  if (id) {
    check(await supabase.from('bookings').update(input).eq('id', id));
  } else {
    check(await supabase.from('bookings').insert(input));
  }
}

/** Deletes a booking and its payments. Payments go first because they reference the booking. */
export async function deleteBooking(id: string): Promise<void> {
  check(await supabase.from('payments').delete().eq('booking_id', id));
  check(await supabase.from('bookings').delete().eq('id', id));
}

export async function addPayment(input: PaymentInput): Promise<void> {
  check(await supabase.from('payments').insert(input));
}

export async function setPaymentStatus(id: string, status: PaymentStatus): Promise<void> {
  check(await supabase.from('payments').update({ status }).eq('id', id));
}

export async function addExpense(input: ExpenseInput): Promise<void> {
  check(await supabase.from('expenses').insert(input));
}

export async function deleteExpense(id: string): Promise<void> {
  check(await supabase.from('expenses').delete().eq('id', id));
}
