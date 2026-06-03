# syntax=docker/dockerfile:1

# ─── Base ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
COPY package.json package-lock.json ./

# ─── Dev ──────────────────────────────────────────────────────────────────────
FROM base AS dev
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --loglevel error --no-fund --no-audit
COPY . .
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser
EXPOSE 5001
CMD ["npm", "run", "dev:nodemon"]

# ─── Build ────────────────────────────────────────────────────────────────────
FROM base AS build
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --loglevel error --no-fund --no-audit
COPY . .
RUN npm run build

# ─── Production (Jenkins → Docker Swarm) ──────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --prefer-offline --loglevel error --no-fund --no-audit \
    && addgroup -S appgroup && adduser -S appuser -G appgroup \
    && mkdir -p /app/dist/uploads \
    && chown -R appuser:appgroup /app
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
USER appuser
EXPOSE 5001
CMD ["node", "dist/server.js"]
