FROM node:20-alpine

WORKDIR /workspace

RUN npm install -g pnpm@8

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

ARG UID=1000
ARG GID=1000

RUN chown -R ${UID}:${GID} /workspace
CMD ["pnpm", "run", "start:prod"]
