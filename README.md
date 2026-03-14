# Escorta

An escort / companionship marketplace MVP where providers can create profiles and clients can browse and send booking requests.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL + Prisma
- **Auth**: JWT (bcrypt for passwords)

## Project Structure

```
src/
  app/           # Routes, pages, API routes
  components/    # Reusable UI components
  contexts/      # React contexts (Auth)
  lib/           # Utilities (Prisma client)
  types/         # TypeScript types
prisma/
  schema.prisma  # Database schema
  seed.js        # Seed script
docs/
  MVP_DevPlan.md
  Data_Modeling.md
```

## Quick Start

### 1. Create database

```bash
sudo -u postgres createdb escorta
```

### 2. Install and setup

```bash
cp .env.example .env   # Edit DATABASE_URL if needed
npm install
npx prisma generate
npx prisma db push     # or: npx prisma migrate dev
npm run db:seed
```

### 3. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Routes

| Route | Description |
|-------|-------------|
| `/` | Browse escorts (with filters) |
| `/escorts/[id]` | Escort profile + booking form |
| `/login` | Login |
| `/register` | Sign up (client/escort) |
| `/dashboard` | User dashboard |
| `/dashboard/profile` | Create escort profile (escort role) |

## API

- `POST /api/auth/register` — Register
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Current user (Bearer token)
- `GET /api/escorts` — List escorts (query: city, minAge, maxAge, minPrice, maxPrice, service)
- `GET /api/escorts/[id]` — Escort detail
- `POST /api/escorts` — Create escort profile (auth, escort role)
- `POST /api/bookings` — Create booking (auth, client role)
