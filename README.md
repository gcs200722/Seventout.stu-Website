# Seventout.stu-Website Monorepo

Monorepo for Seventout student website platform.

## Tech stack

- Frontend: Next.js (`web`)
- Backend: NestJS + TypeORM (`api`)
- Database: PostgreSQL
- Cache: Redis
- Queue: BullMQ (phase 1), SQS-ready abstraction (phase 2)
- Storage: AWS S3
- Infra target: AWS
- DevOps: Docker + GitHub Actions

## Project structure

- `web`: Next.js frontend app
- `api`: NestJS backend app
- `packages/contracts`: shared contracts (queue names, shared types)

## Prerequisites

- Node.js 22+
- Corepack enabled
- Docker Desktop

## Local setup

1. Copy env templates:
   - `cp .env.example .env` (or create manually on Windows)
   - `cp api/.env.example api/.env`
   - `cp web/.env.example web/.env.local`
2. Start infra services:
   - `docker compose up -d`
3. Install dependencies:
   - `corepack pnpm install`

## Run apps

- Start all apps in monorepo:
  - `corepack pnpm dev`
- Frontend only:
  - `corepack pnpm --filter @apps/web dev`
- Backend only:
  - `corepack pnpm --filter @apps/api dev`

Default ports:
- Web: `3000`
- API: `3001` with global prefix `/api`
- Postgres (Docker): `5433` mapped to container `5432`
- Redis (Docker): `6379`

## Database migration

- Run migrations:
  - `corepack pnpm --filter @apps/api migration:run`

## Scripts

- `corepack pnpm lint`
- `corepack pnpm test`
- `corepack pnpm build`

## Commit message convention

- Required format: `<type>(scope): <message>`
- Example: `feat(api): add queue abstraction for jobs`
- Supported types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- Commit hook is enforced via Husky + Commitlint

## Queue strategy

- Phase 1: use BullMQ adapter (`QueuePort` -> BullMQ)
- Phase 2: add SQS adapter implementing same `QueuePort`
- Domain services should depend on `QueuePort`, not queue vendor SDK

## DevOps docs

- `docs/devOps/vercel-vps-s3.md`: deployment guide for `Vercel + 1 VPS + S3`