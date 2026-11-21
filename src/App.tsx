import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { fetchRole } from './lib/api';
import type { Role } from './lib/access';
import { errorMessage } from './lib/format';
import { AppShell } from './components/AppShell';
import { LoginPage } from './components/LoginPage';
import { btnGhost } from './components/ui';

type AuthState =
  | { status: 'loading' }
  | { status: 'signed_out'; notice?: string }
  | { status: 'unauthorized' }
  | { status: 'ready'; role: Role; email: string };

/** A valid Supabase login is not enough: the user must also be listed in public.founders. */
async function resolve(session: Session | null): Promise<AuthState> {
  if (!session) return { status: 'signed_out' };
  try {
    const role = await fetchRole(session.user.id);
    if (!role) return { status: 'unauthorized' };
    return { status: 'ready', role, email: session.user.email ?? '' };
  } catch (e) {
    return { status: 'signed_out', notice: errorMessage(e) };
  }
}

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    const apply = (s: AuthState) => {
      if (active) setAuth(s);
    };

    supabase.auth.getSession().then(({ data }) => resolve(data.session)).then(apply);
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolve(session).then(apply);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (auth.status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>;
  }
  if (auth.status === 'signed_out') return <LoginPage notice={auth.notice} />;
  if (auth.status === 'unauthorized') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-sm space-y-4 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
          <h1 className="text-lg font-semibold text-slate-900">Not authorized</h1>
          <p className="text-sm text-slate-500">This account is not one of the two founder accounts for Urban Home Care.</p>
          <button className={btnGhost} onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
    );
  }
  return <AppShell role={auth.role} email={auth.email} />;
}
