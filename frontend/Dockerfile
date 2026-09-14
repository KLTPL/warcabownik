FROM node:20-alpine

WORKDIR /workspace

RUN npm install -g pnpm@8

COPY pnpm-workspace.yaml ./

COPY packages/shared/package.json ./packages/shared/
COPY frontend/package.json ./frontend/

RUN pnpm install

COPY packages/shared ./packages/shared
COPY frontend ./frontend

WORKDIR /workspace/frontend

CMD ["pnpm", "run", "dev", "--host"]
