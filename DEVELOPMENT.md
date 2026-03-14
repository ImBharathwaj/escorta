# Escorta — Development status

This file summarizes what is implemented and what remains for the Escorta MVP. See `docs/MVP_DevPlan.md` for the full spec.

---

## Tech Stack (aligned with [Verlano](https://github.com/ImBharathwaj/Verlano))

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL + Prisma
- **Auth**: JWT + bcrypt

---

## Project Structure

```
src/
  app/           # Routes, pages, API routes
  components/    # Reusable UI (layout, escort)
  contexts/     # AuthContext
  lib/           # Prisma client
  types/         # TypeScript types
prisma/
  schema.prisma
  seed.js
docs/
  MVP_DevPlan.md
  Data_Modeling.md
```

---

## What's done

### Phase 1 — Setup & database

- Prisma schema: User, EscortProfile, Service, EscortService, EscortPhoto, EscortAvailability, Booking, Message
- Seed script for default services
- Auth: register, login, JWT /api/auth/me

### Phase 2 — Escort browsing

- GET /api/escorts — list with filters (city, age, price, service)
- GET /api/escorts/[id] — escort detail with photos, services
- Home page with filters and escort grid
- Escort detail page with booking form

### Phase 3 — Bookings

- POST /api/bookings — create booking (client only)
- Booking form on escort page
- Dashboard with booking success message

### Phase 4 — Escort profile creation

- POST /api/escorts — create escort profile (escort role)
- /dashboard/profile — create profile form

---

## What's next

- Escort profile edit & photo upload (MinIO/S3)
- Booking respond (accept/reject) for escorts
- Admin panel (moderation)
- Messages (optional for MVP)

---

## How to run

1. Create DB: `sudo -u postgres createdb escorta`
2. Setup: `cp .env.example .env` then `npm install && npx prisma generate && npx prisma db push && npm run db:seed`
3. Dev: `npm run dev` → http://localhost:3000
