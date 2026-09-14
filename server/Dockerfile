FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm@8
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
RUN pnpm prisma generate
RUN pnpm run build
CMD ["pnpm", "run", "start:prod"]
