# Pro's Sanitation Limited — Operations Portal

Internal employee operations portal landing page for field staff, supervisors, and administrators.

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Neon PostgreSQL + Prisma
- Better Auth
- Framer Motion
- Lucide React

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Project Structure

```
src/
  app/              # App Router pages & global styles
  components/
    layout/         # Sidebar, top nav, portal shell, background
    sections/       # Landing page sections
    ui/             # Reusable buttons, cards, metrics
  lib/              # Services, auth helpers, display utilities
```

See `ARCHITECTURE.md` (data model) and `DEPLOYMENT.md` (Vercel env vars).

## Scripts

- `npm run dev` — development server (port 3001)
- `npm run build` — production build
- `npm run start` — production server
- `npm run lint` — ESLint
- `npm run db:migrate` — Prisma migrate dev
