# Performance & Load Testing (Starter)

This doc provides a repeatable baseline for load testing **read-only polling endpoints** before production.

## Prereqs

- Start the app:
  - `npm run dev` (or point `BASE_URL` at your deployed/staging instance)

## Polling endpoints load test

Run:

- `BASE_URL=http://localhost:3000 npm run loadtest:polling`

This uses `autocannon` and targets:

- `GET /api/adult-services`
- `GET /api/escorts?city=chennai`
- `GET /api/live/sessions`

## Interpreting results

Watch for:

- Rising latency (p95/p99)
- Error rate
- DB saturation / slow queries

If results regress, add caching (`s-maxage` + `stale-while-revalidate`), indexes, or reduce polling frequency.

