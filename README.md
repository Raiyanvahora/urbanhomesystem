# Urban Home Care · Founders Dashboard

Bookings, payments and expenses for Urban Home Care (sofa deep cleaning, Anand, Gujarat).
React + TypeScript + Tailwind CSS (frontend), Supabase Auth + PostgreSQL + RLS (backend).

## 1. Supabase setup

1. Create a project at supabase.com.
2. **Authentication → Providers → Email**: turn off "Allow new users to sign up" so only the accounts you create can log in.
3. **Authentication → Users → Add user** (twice): one per founder, password set, "Auto Confirm User" ticked.
4. **SQL Editor**: open `supabase/schema.sql`, replace the two example emails in STEP A with the founders' real emails, then run the whole file once.

## 2. Run the app

```bash
npm install
cp .env.example .env.local   # then set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

The anon key is found in Supabase → Project Settings → API. Use the **anon public** key only.
Never put the `service_role` key in this project.

## 3. Deploy

`npm run build` produces `dist/`. Deploy it to Vercel, Netlify or Cloudflare Pages, and set the two `VITE_` variables there.

## Notes

- Revenue counts only payments with status **Paid**.
- Starting totals (10 jobs, ₹10,000 revenue, Meta ₹847.46, chemicals ₹260, machine ₹4,000) live in `opening_balances`, not as fake customer records.
- Fuel (₹200–₹300) was not seeded because the exact figure was not given. Add it from the Expenses page; until then the profit card shows "Costs may be incomplete".
- Technician access is not built yet. See `src/lib/access.ts` for where the role check goes.
