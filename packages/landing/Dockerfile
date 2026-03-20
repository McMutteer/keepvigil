FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/landing/package.json packages/landing/
COPY packages/dashboard/package.json packages/dashboard/
COPY packages/admin/package.json packages/admin/

# Install deps for landing + dashboard + admin
RUN pnpm install --filter @keepvigil/landing --filter @keepvigil/dashboard --filter @keepvigil/admin --frozen-lockfile

# Copy source
COPY packages/landing/ packages/landing/
COPY packages/dashboard/ packages/dashboard/
COPY packages/admin/ packages/admin/

# Build all
RUN cd packages/landing && pnpm build
RUN cd packages/dashboard && pnpm build
RUN cd packages/admin && pnpm build

# Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/packages/landing/out /usr/share/nginx/html
COPY --from=builder /app/packages/dashboard/dist /usr/share/nginx/html/dashboard
COPY --from=builder /app/packages/admin/dist /usr/share/nginx/html/admin
COPY packages/landing/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
