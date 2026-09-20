FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@12.4.1 --activate
WORKDIR /workspace

COPY pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY server/package.json ./server/
RUN pnpm install

COPY packages/shared ./packages/shared
COPY server ./server

RUN pnpm --filter @warcabownik/shared run build

WORKDIR /workspace/server
RUN pnpm prisma generate
RUN pnpm run build

FROM node:20-alpine AS runner

# turn on node's native performance boosts
ENV NODE_ENV=production
WORKDIR /workspace

# copy ONLY the compiled files and node_modules from stage 1
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /workspace/packages/shared/dist ./packages/shared/dist
COPY --from=builder /workspace/server/package.json ./server/package.json
COPY --from=builder /workspace/server/node_modules ./server/node_modules
COPY --from=builder /workspace/server/prisma ./server/prisma
COPY --from=builder /workspace/server/dist ./server/dist

USER node
WORKDIR /workspace/server

CMD ["node", "dist/src/main.js"]
