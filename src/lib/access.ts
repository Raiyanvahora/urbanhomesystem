// Role-based access helpers.
//
// Today: only two founder accounts exist, and the database (RLS) is the real gate.
// Later: add a `technician` role (e.g. a `profiles` table with a role column and an
// assigned_technician_id on bookings) and tighten RLS. The UI here already hides
// financial data based on these helpers, so technicians will see the right screens
// without changes to the pages themselves.

export type Role = 'founder' | 'technician';

export const canViewFinancials = (role: Role | null): boolean => role === 'founder';
export const canManageExpenses = (role: Role | null): boolean => role === 'founder';
export const canManagePayments = (role: Role | null): boolean => role === 'founder';
