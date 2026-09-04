# Multi-stage Dockerfile for Hotel Offer Orchestrator
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json tsconfig*.json nest-cli.json ./
RUN npm install --ignore-scripts=false

# Copy source and compile
COPY src/ ./src/
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts=false

# Copy compiled artifacts from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security best practices
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

CMD ["node", "dist/main.js"]
