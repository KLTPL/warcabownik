FROM node:20-alpine

WORKDIR /workspace

RUN npm install -g pnpm@8

COPY pnpm-workspace.yaml ./

COPY packages/shared/package.json ./packages/shared/
COPY server/package.json ./server/

RUN pnpm install

COPY packages/shared ./packages/shared
COPY server ./server

WORKDIR /workspace/server

RUN pnpm prisma generate
RUN pnpm run build

CMD ["pnpm", "run", "start:prod"]
