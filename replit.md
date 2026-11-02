# Habit Circle

A simple community habit tracker for friends and colleagues with private habits, optional sharing, daily tracking, and comments.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/habit-circle/` — React web app, served at `/`
- `artifacts/api-server/` — shared API at `/api`
- `lib/api-spec/openapi.yaml` — API source of truth
- `lib/db/src/schema/` — account, session, habit, completion, and comment tables

## Architecture decisions

- Custom email/password accounts preserve the user's explicit no-email-confirmation requirement. Passwords use salted scrypt, and sessions use opaque HTTP-only cookies with hashed tokens persisted in PostgreSQL.
- Current streak counts consecutive dates backwards from the latest completion, even when that completion is not today.
- New accounts start with no habits. Do not seed other people's personal habits into new accounts or fabricate community activity.

## Product

- Immediate sign-up, sign-in and sign-out.
- Personal habit creation, private by default, with descriptive context.
- Seven-day owner-only completion tracking, lifetime days done and current streak.
- Shared community habits and member comments with author display names.

## User preferences

- Keep the application simple and easy to use. Do not add functions not requested.
- Make reasonable choices for unspecified details, including design.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
