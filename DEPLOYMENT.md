# Vercel deployment

## Prerequisites

1. Neon PostgreSQL database with connection string (`sslmode=require`).
2. Apply migrations: `npx prisma migrate deploy`
3. Optional seed: `npx prisma db seed`

## Environment variables (Vercel project settings)

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Neon pooler URL |
| `BETTER_AUTH_SECRET` | Yes | `openssl rand -base64 32` (min 32 chars) |
| `BETTER_AUTH_URL` | Yes | Production URL, e.g. `https://your-app.vercel.app` |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Yes | Same as `BETTER_AUTH_URL` |
| `EMPLOYEE_SIGNUP_MODE` | No | `open` (default), `disabled`, or `invite` |
| `SIGNUP_INVITE_CODES` | If invite mode | Comma-separated secret codes |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Recommended | Preview domains, e.g. `https://*.vercel.app` |
| `ADMIN_API_SECRET` | Optional | Admin unlock API |
| `RESEND_API_KEY` | Optional | Password reset email |
| `PASSWORD_RESET_EMAIL_FROM` | Optional | Sender for reset emails |

Copy from `.env.example` for local development. **Do not commit** `.env`, `.env.local`, or secrets.

## Build

Vercel runs `npm run build` (Next.js 15 + Turbopack). `postinstall` runs `prisma generate`.

## Data

All operational data is stored in Neon via Prisma. See `ARCHITECTURE.md`.
