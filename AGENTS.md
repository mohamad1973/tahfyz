<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Tahfyz is a single Next.js 16 (App Router, Turbopack) web app. The data layer is **Prisma + MySQL** (`src/lib/db.ts`, `src/lib/store.ts`). The `supabase/schema.sql` file is a legacy/unused migration artifact — ignore it; the app does not use Supabase for data.

### Database (must be started manually)

There is no systemd in this container, so MariaDB (the local stand-in for the Hostinger MySQL) does not auto-start. Before running the app, tests, or any Prisma command, start it:

```bash
sudo mkdir -p /run/mysqld && sudo chown mysql:mysql /run/mysqld
sudo mariadbd --user=mysql   # run in a tmux/background session; it stays in foreground
```

Local DB/credentials already exist: database `tahfyz`, user `tahfyz` / password `tahfyz`. Verify with `sudo mysqladmin ping`.

`.env` (gitignored, read by BOTH Next.js and the Prisma CLI) must contain at least:

```env
DATABASE_URL="mysql://tahfyz:tahfyz@127.0.0.1:3306/tahfyz"
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ACADEMY_WHATSAPP=201000000001
```

Note: Prisma CLI only reads `.env`, not `.env.local`. If `.env` is missing, recreate it with the values above.

To (re)initialize schema + demo data after starting MariaDB: `npm run db:push` then `npm run db:seed`.

### Running / commands

- Dev server: `npm run dev` (http://localhost:3000).
- Lint: `npm run lint` (currently reports 3 pre-existing `no-html-link-for-pages` errors in `src/app/admin/page.tsx` and `src/app/student/page.tsx` — not caused by setup).
- Build: `npm run build` (runs `prisma generate` + `next build`; does not fail on the lint errors above).
- There is no automated test suite in this repo.

### Non-obvious app behavior

- Login is by **username**, not email (e.g. `admin` / `admin123`, teachers `ahmed` / `teacher123`). Seeded emails exist but the sign-in form field is username.
- Passwords are hashed with `sha256("tahfyz:<password>")` (see `prisma/seed.mjs` / `src/lib/actions.ts`), despite `bcryptjs` being a dependency.
- Stripe, Vercel Blob, and the MyMemory translation endpoint are optional external integrations. Without their env vars, card payment falls back to an instant demo confirm, teacher media upload is disabled, and chat translation passes text through unchanged.
