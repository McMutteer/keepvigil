FROM node:22-alpine AS base
RUN npm i -g corepack@latest && corepack enable
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/github/package.json ./packages/github/
COPY packages/executors/package.json ./packages/executors/
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM deps AS build
COPY tsconfig.base.json tsconfig.json ./
COPY packages/ ./packages/
RUN pnpm build

# --- Production ---
FROM base AS production
ENV NODE_ENV=production

# Install Chromium for Playwright (system browser avoids glibc issues on Alpine)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Playwright to use system Chromium instead of downloading its own
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Non-root user for security
RUN addgroup -g 1001 -S vigil && adduser -u 1001 -S vigil -G vigil

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/github/package.json ./packages/github/
COPY packages/executors/package.json ./packages/executors/
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/github/dist ./packages/github/dist
COPY --from=build /app/packages/executors/dist ./packages/executors/dist
COPY drizzle/ ./drizzle/

COPY --chown=vigil:vigil entrypoint.sh ./
RUN chmod +x entrypoint.sh

USER vigil

EXPOSE 3200
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --spider -q http://localhost:3200/health || exit 1

CMD ["./entrypoint.sh"]
