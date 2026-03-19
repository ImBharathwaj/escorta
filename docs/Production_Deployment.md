# Production Deployment (Baseline)

This is a starter guide aligned with the “~1000 concurrent users” architecture in `docs/Production_Readiness_Plan.md`.

## Recommended baseline components

- 2× Next.js app instances behind a load balancer (or a platform autoscaler)
- Postgres (managed if possible)
- PgBouncer in front of Postgres
- Object storage (S3/MinIO)
- LiveKit deployed separately (or LiveKit Cloud)
- CDN in front of static assets/pages

## Docker compose (local production-like)

This repo includes a production-style compose file:

- `docker-compose.prod.yml`

It includes:

- `postgres`
- `pgbouncer`
- `minio`
- `app` (Next.js)

Run:

```bash
docker compose -f docker-compose.prod.yml up --build
```

Then run migrations in the container (example):

```bash
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

## Reverse proxy / TLS

In real production:

- Terminate TLS at a reverse proxy / load balancer.
- Forward requests to app instances over private networking.

## Notes for Prisma + PgBouncer

- Prefer `POOL_MODE=transaction`.
- Point `DATABASE_URL` at PgBouncer.
- Keep pool sizes conservative; scale with real metrics.

