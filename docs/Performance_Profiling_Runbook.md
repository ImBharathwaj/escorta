# Performance Profiling Runbook

This runbook documents how to profile the critical pages before production.

## Critical pages

- Landing (`/`)
- Companions listing (`/companions`)
- Dashboard (`/dashboard`)
- Live (`/live`)
- Video call (`/video-call/[sessionId]`)

## Quick browser profiling checklist

1. Use Chrome DevTools → Performance.
2. Record load + one key interaction (scroll/filter/send).
3. Note:
   - JS bundle size (Network)
   - hydration time (Performance)
   - long tasks (>50ms)
   - re-render hotspots (React DevTools Profiler)

## Server/API profiling

- Use DB logs / Prisma query logs (temporarily) to identify slow queries.
- For hot read APIs, prefer caching:
  - `Cache-Control: s-maxage=...` + `stale-while-revalidate=...`
  - `export const revalidate = ...` for App Router route handlers where safe.

