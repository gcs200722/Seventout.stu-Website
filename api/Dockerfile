FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY api/package.json ./api/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
RUN corepack pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/api/node_modules ./api/node_modules
COPY . .
RUN corepack pnpm --filter @apps/api build
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/api/dist ./api/dist
COPY --from=builder /app/api/package.json ./api/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/api/node_modules ./api/node_modules
EXPOSE 3001
CMD ["node", "api/dist/main.js"]
