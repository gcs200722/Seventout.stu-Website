FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY web/package.json ./web/package.json
RUN corepack pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack pnpm --filter @apps/web build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/web/.next ./web/.next
COPY --from=builder /app/web/public ./web/public
COPY --from=builder /app/web/package.json ./web/package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["corepack", "pnpm", "--filter", "@apps/web", "start"]
