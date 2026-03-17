FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/landing/package.json packages/landing/

# Install deps for landing only
RUN pnpm install --filter @keepvigil/landing --frozen-lockfile

# Copy landing source
COPY packages/landing/ packages/landing/

# Build static export
RUN cd packages/landing && pnpm build

# Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/packages/landing/out /usr/share/nginx/html
COPY packages/landing/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
