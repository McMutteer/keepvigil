FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/landing/package.json packages/landing/
COPY packages/dashboard/package.json packages/dashboard/

# Install deps for landing + dashboard
RUN pnpm install --filter @keepvigil/landing --filter @keepvigil/dashboard --frozen-lockfile

# Copy source
COPY packages/landing/ packages/landing/
COPY packages/dashboard/ packages/dashboard/

# Build both
RUN cd packages/landing && pnpm build
RUN cd packages/dashboard && pnpm build

# Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/packages/landing/out /usr/share/nginx/html
COPY --from=builder /app/packages/dashboard/dist /usr/share/nginx/html/dashboard
COPY packages/landing/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
