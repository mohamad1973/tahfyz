# Tahfyz

Online Quran academy for international students with Egyptian teachers.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma + MySQL (Hostinger)
- Vercel Blob for teacher media uploads (photo/audio/video)

## Run locally

```bash
npm install
npm run prisma:generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Academy admin | admin@tahfyz.com | admin123 |
| Teacher (×8) | ahmed@ / ibrahim@ / omar@ / yusuf@ / khaled@ / mostafa@ / abdelrahman@ / hassan@tahfyz.com | teacher123 |

Student accounts are created automatically when admin confirms payment on a guest booking.

Parents register from the Sign in page, then link a student by email.

## Booking flow

1. Guest opens **/teachers**, picks a calendar hour, submits guest details
2. Continues to **/booking/[id]/pay** — pay by **card (demo)** or academy WhatsApp
3. With `STRIPE_SECRET_KEY` set, card uses real Stripe Checkout; otherwise demo confirms instantly
4. Admin can still confirm manual payments on **/admin**
5. Slot shades as booked; student account is created; teacher is notified

## Database setup (Hostinger + Vercel)

`localhost` works only for apps running **on Hostinger**. Vercel and your PC need the **Remote MySQL** hostname.

1. In hPanel create MySQL database + user
2. Open **Remote MySQL** → enable **Any Host** (`%`) for your DB → **Create**
3. Copy the **MySQL hostname** shown at the top of that page (not `localhost`)
4. Set `.env.local` (URL-encode special chars in the password, e.g. `@` → `%40`):

```env
DATABASE_URL="mysql://USER:PASSWORD@REMOTE_HOSTNAME:3306/DB_NAME"
```

5. Generate and push schema:

```bash
npm run prisma:generate
npm run db:push
npm run db:seed
```

Use the same `DATABASE_URL` in Vercel → Project → Settings → Environment Variables.

## Media upload (Vercel Blob)

1. Create a Blob Store in Vercel project
2. Add `BLOB_READ_WRITE_TOKEN` to `.env.local` and Vercel env vars
3. Teacher dashboard uploads now store URLs in DB and files in Blob

## Deploy (Vercel + tahfyz domain)

1. Push repo to GitHub
2. Import in Vercel
3. Add env vars:
   - `DATABASE_URL`
   - `BLOB_READ_WRITE_TOKEN`
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_ACADEMY_WHATSAPP`
   - Stripe keys (optional)
4. Build command: `npm run build`
5. (once) Run `npm run db:push` and `npm run db:seed` against production DB
6. Attach domain `tahfyz.com` (or your custom tahfyz domain)

## Brand

**Tahfyz** — Quran & sciences for students in the US and Europe.
