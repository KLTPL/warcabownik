FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm@8
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
CMD ["pnpm", "run", "dev", "--host"]
