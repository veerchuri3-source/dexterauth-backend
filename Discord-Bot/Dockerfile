# DexterAuth Discord Bot — production image (Fly.io / Docker)
FROM node:20-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Build TypeScript, then run the compiled bot
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Runtime env comes from `fly secrets set` — never bake tokens into the image
CMD ["node", "dist/index.js"]
