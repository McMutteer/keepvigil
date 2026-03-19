# Pinned to Node 22.14 Alpine — update periodically for security patches
# To re-pin: docker pull node:22.14-alpine && docker inspect --format='{{index .RepoDigests 0}}'
ARG NODE_IMAGE=node:22.14-alpine@sha256:01393fe5a51489b63da0ab51aa8e0a7ff9990132917cf20cfc3d46f5e36c0e48
FROM ${NODE_IMAGE} AS base
RUN npm i -g corepack@latest && corepack enable
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/github/package.json ./packages/github/
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM deps AS build
COPY tsconfig.base.json tsconfig.json ./
COPY packages/core/ ./packages/core/
COPY packages/github/ ./packages/github/
RUN pnpm build

# --- Production ---
FROM ${NODE_IMAGE} AS production
ENV NODE_ENV=production
RUN npm i -g corepack@latest && corepack enable
WORKDIR /app

RUN apk add --no-cache git ca-certificates

# Non-root user for security
RUN addgroup -g 1001 -S vigil && adduser -u 1001 -S vigil -G vigil

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/github/package.json ./packages/github/
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/github/dist ./packages/github/dist
COPY drizzle/ ./drizzle/

COPY --chown=vigil:vigil entrypoint.sh ./
RUN chmod +x entrypoint.sh

USER vigil

EXPOSE 3200
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --spider -q http://localhost:3200/health || exit 1

CMD ["./entrypoint.sh"]
