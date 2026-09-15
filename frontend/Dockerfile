FROM node:20-alpine

WORKDIR /workspace

RUN npm install -g pnpm@8

COPY pnpm-workspace.yaml ./

COPY packages/shared/package.json ./packages/shared/
COPY frontend/package.json ./frontend/

RUN pnpm install

COPY packages/shared ./packages/shared
COPY frontend ./frontend

RUN pnpm --filter @warcabownik/shared run build

WORKDIR /workspace/frontend

ARG UID=1000
ARG GID=1000

RUN chown -R ${UID}:${GID} /workspace

CMD ["pnpm", "run", "dev", "--host"]
