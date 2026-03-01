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
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/github/package.json ./packages/github/
COPY packages/executors/package.json ./packages/executors/
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/github/dist ./packages/github/dist
COPY --from=build /app/packages/executors/dist ./packages/executors/dist
COPY drizzle/ ./drizzle/

EXPOSE 3200
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --spider -q http://localhost:3200/health || exit 1

# Temporary placeholder server until Section 2 provides real entrypoint
CMD ["node", "-e", "import('node:http').then(({createServer})=>{createServer((req,res)=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({status:'ok',service:'vigil',version:'0.1.0',timestamp:new Date().toISOString()}));}).listen(process.env.PORT||3200,()=>console.log('Vigil running on port '+(process.env.PORT||3200)));})"]
