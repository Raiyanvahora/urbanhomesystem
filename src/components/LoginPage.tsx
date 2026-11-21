import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { errorMessage } from '../lib/format';
import { btnPrimary, ErrorBanner, Field, inputCls } from './ui';

export function LoginPage({ notice }: { notice?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(errorMessage(error));
    // On success, App's onAuthStateChange listener checks the founder role and switches screens.
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-600 to-brand-900 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white">
            UH
          </div>
          <h1 className="text-xl font-bold text-slate-900">Urban Home Care</h1>
          <p className="text-sm text-slate-500">Founders' dashboard</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email">
            <input className={inputCls} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <input className={inputCls} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <ErrorBanner message={error ?? notice ?? null} />
          <button className={`${btnPrimary} w-full`} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">Access is limited to the two founder accounts.</p>
      </div>
    </div>
  );
}
