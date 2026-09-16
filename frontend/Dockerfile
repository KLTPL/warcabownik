FROM node:20-alpine

ARG UID=1000
ARG GID=1000

RUN npm install -g pnpm@8

RUN mkdir -p /workspace && chown ${UID}:${GID} /workspace

USER ${UID}:${GID}
WORKDIR /workspace

COPY --chown=${UID}:${GID} pnpm-workspace.yaml ./
COPY --chown=${UID}:${GID} packages/shared/package.json ./packages/shared/
COPY --chown=${UID}:${GID} frontend/package.json ./frontend/

RUN pnpm install

COPY --chown=${UID}:${GID} packages/shared ./packages/shared
COPY --chown=${UID}:${GID} frontend ./frontend

RUN pnpm --filter @warcabownik/shared run build

WORKDIR /workspace/frontend

CMD ["pnpm", "run", "dev", "--host"]
