FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm@8
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
RUN npx prisma generate
CMD ["pnpm", "run", "start:dev"]
