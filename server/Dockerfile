FROM node:20-alpine

# 1. Define the user IDs at the very top
ARG UID=1000
ARG GID=1000

# 2. Install global tools as root
RUN npm install -g pnpm@8

# 3. Create the workspace and assign ownership BEFORE switching users
RUN mkdir -p /workspace && chown ${UID}:${GID} /workspace

# 4. Switch to the non-root user. Every command after this runs as you!
USER ${UID}:${GID}
WORKDIR /workspace

# 5. Copy files while simultaneously applying ownership (bypasses the chown penalty)
COPY --chown=${UID}:${GID} pnpm-workspace.yaml ./
COPY --chown=${UID}:${GID} packages/shared/package.json ./packages/shared/
COPY --chown=${UID}:${GID} server/package.json ./server/

# 6. Install dependencies natively as your user
RUN pnpm install

# 7. Copy source code with ownership
COPY --chown=${UID}:${GID} packages/shared ./packages/shared
COPY --chown=${UID}:${GID} server ./server

# 8. Build the shared package
RUN pnpm --filter @warcabownik/shared run build

WORKDIR /workspace/server

# 9. Generate types and build the server natively as your user
RUN pnpm prisma generate
RUN pnpm run build

# Start the application
CMD ["pnpm", "run", "start:prod"]
