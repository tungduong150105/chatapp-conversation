# syntax=docker/dockerfile:1


FROM node:22-alpine AS base

WORKDIR /app

FROM base AS deps

# Copy workspace configs
COPY package.json package-lock.json ./

# Copy package.json file for all needed packages
COPY packages/common/package.json ./packages/common/
COPY services/chat-service/package.json ./services/chat-service/

# Install Dependencies
RUN npm ci


FROM deps AS builder

# Copy source code
COPY tsconfig.base.json tsconfig.json ./
COPY packages/common ./packages/common
COPY services/chat-service ./services/chat-service
COPY proto ./proto

# Build common package first
RUN npm run build --workspace=packages/common

# Build chat-service
RUN npm run build --workspace=services/chat-service


FROM node:22-alpine AS production

# Create non-root user 
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser

WORKDIR /app

# Copy workspace configuration
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./

# Copy package.json files
COPY packages/common/package.json ./packages/common/
COPY services/chat-service/package.json ./services/chat-service/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/packages/common/dist ./packages/common/dist
COPY --from=builder /app/services/chat-service/dist ./services/chat-service/dist
COPY --from=builder /app/proto ./proto

# Change ownership to non-root
RUN chown -R nodeuser:nodejs /app

USER nodeuser

ENV NODE_ENV=production
ENV CHAT_SERVICE_PORT=4002

EXPOSE 4002

WORKDIR /app/services/chat-service

CMD [ "node", "dist/index.js" ]