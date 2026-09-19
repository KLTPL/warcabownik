FROM node:20-alpine

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

USER node

CMD ["pnpm", "run", "start:prod"]
