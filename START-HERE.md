# Pro's Sanitation Portal — Start Here

## Correct project path

Open this folder as your Cursor workspace (single app root):

```
C:\Users\Kerwin\Projects\pros-sanitation-portal
```

You should see `package.json` in the **same folder** you open—not inside another `pros-sanitation-portal` subfolder.

## Startup commands

Run all commands from the project root:

```bash
npm install
npm run verify
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verify you are in the right location

```bash
npm run whereami
npm run verify
```

Expected:

- `whereami` prints the path ending in `pros-sanitation-portal`
- `verify` prints `Project Root OK`

If `verify` fails, `cd` to the folder that contains `package.json`.

## Folder rules

1. **One app root only** — `package.json`, `next.config.ts`, and `src/` live together at the top level.
2. **Do not create** `pros-sanitation-portal/pros-sanitation-portal/` or run `create-next-app` inside this repo again.
3. **Run npm only** from the workspace root (where `package.json` is).
4. **Environment** — keep secrets in `.env.local` at the project root (never commit it).

## Project layout (actual)

```
pros-sanitation-portal/
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
├── .env.local
├── .env.example
├── src/
│   ├── middleware.ts
│   ├── app/
│   ├── components/
│   └── lib/
├── public/                (add static assets here when needed)
├── .vscode/settings.json
├── START-HERE.md
└── node_modules/
```

## Other scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
