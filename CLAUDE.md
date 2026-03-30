# TelStaff Viewer

## Project
Real-time staffing dashboard for Edmonton Fire Rescue. Scrapes Telestaff (Kronos) scheduling system and displays station/truck/crew data across 31 stations and 4 platoons.

## Tech Stack
- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 with custom theme (dark command-center aesthetic)
- **Database:** PostgreSQL via Prisma 7 with `@prisma/adapter-pg`
- **Auth:** NextAuth.js v4 with credentials provider
- **Scraping:** Playwright (future — currently using mock data)
- **Deployment:** Railway via GitHub

## Key Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npx prisma generate` — Regenerate Prisma client after schema changes
- `npx prisma migrate dev` — Run database migrations

## Architecture
- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — React components (client-side)
- `src/lib/` — Server utilities (Prisma, auth, encryption, scraper)
- `src/generated/prisma/` — Auto-generated Prisma client (do not edit)
- `prisma/schema.prisma` — Database schema

## Conventions
- Font: Barlow Condensed (display) + Barlow (body)
- Color theme: Dark charcoal base with ember/orange accents
- All pages use `font-display` for headings, `font-body` for text
- Tailwind custom colors defined in globals.css `:root` and `@theme inline`
- Prisma client imported from `@/generated/prisma/client`
- Telestaff credentials encrypted with AES-256-GCM before storage

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — NextAuth session secret
- `NEXTAUTH_URL` — App URL (http://localhost:3000 in dev)
- `ENCRYPTION_KEY` — 64 hex char key for AES-256 encryption
