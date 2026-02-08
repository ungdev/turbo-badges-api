# Stage 1: Build
FROM node:25-alpine AS builder

WORKDIR /srv/app

# Copy package files for dependency installation
COPY package*.json ./
COPY prisma.config.ts ./

# Copy Prisma schema
COPY prisma ./prisma

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy application source code
COPY . ./

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:25-alpine AS production

ENV NODE_ENV=production
WORKDIR /srv/app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./
COPY prisma.config.ts ./

# Copy Prisma schema and migrations
COPY prisma ./prisma

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma Client (production build)
RUN npx prisma generate

# Copy built application from builder stage
COPY --from=builder /srv/app/dist ./dist

# Copy static assets
COPY --from=builder /srv/app/assets ./assets

# Create uploads directory with proper permissions
RUN mkdir -p uploads/pictures uploads/badges && \
    chown -R node:node uploads

# Use non-root user for security
USER node

# Expose application port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/src/main.js"]
