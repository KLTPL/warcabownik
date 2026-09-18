FROM node:20-alpine

ARG UID=1000
ARG GID=1000

RUN npm install -g pnpm@12.4.1

RUN mkdir -p /workspace && chown ${UID}:${GID} /workspace

USER ${UID}:${GID}
WORKDIR /workspace

COPY --chown=${UID}:${GID} pnpm-workspace.yaml ./
COPY --chown=${UID}:${GID} packages/shared/package.json ./packages/shared/
COPY --chown=${UID}:${GID} server/package.json ./server/

RUN pnpm install

COPY --chown=${UID}:${GID} packages/shared ./packages/shared
COPY --chown=${UID}:${GID} server ./server

RUN pnpm --filter @warcabownik/shared run build

WORKDIR /workspace/server

RUN pnpm prisma generate
RUN pnpm run build

CMD ["pnpm", "run", "start:prod"]
