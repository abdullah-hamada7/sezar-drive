# Backend Dockerfile — Hardened for Production
FROM node:22-alpine AS base

# Create app directory and set ownership
WORKDIR /app
RUN chown -R node:node /app

# Install system dependencies
RUN apk add --no-cache openssl

# Install dependencies with non-root ownership
COPY --chown=node:node package.json package-lock.json* ./
COPY --chown=node:node prisma ./prisma/
COPY --chown=node:node prisma.config.ts* ./
COPY --chown=node:node tsconfig.json* ./

# Change user BEFORE running npm ci to ensure cache/node_modules ownership
USER node

RUN npm ci --omit=dev

# Generate Prisma client
RUN DATABASE_URL="postgresql://dummy:5432/mydb" npx prisma generate

# Copy application source
COPY --chown=node:node src ./src/
COPY --chown=node:node scripts ./scripts/

# Local uploads decommissioned per S3-only policy

EXPOSE 3000

CMD ["node", "src/server.js"]
