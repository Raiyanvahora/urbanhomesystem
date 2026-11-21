import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SetupNeeded } from './components/SetupNeeded';
import './index.css';

const root = createRoot(document.getElementById('root')!);
const configured =
  Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!configured) {
  // Show a visible setup message instead of a blank page.
  root.render(
    <StrictMode>
      <SetupNeeded />
    </StrictMode>,
  );
} else {
  // Load the app (and the Supabase client) only once the keys exist.
  void import('./App').then(({ default: App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
}
