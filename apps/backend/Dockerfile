FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --production

# Copy source
COPY . .

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
