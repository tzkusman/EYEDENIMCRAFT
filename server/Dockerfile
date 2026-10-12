# Multi-stage production Dockerfile for EYE Denim Crafts Server
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Security: Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production

# Copy compiled files from builder
COPY --from=builder /app/dist ./dist

USER nodejs

EXPOSE 4000
CMD ["node", "dist/index.js"]
