# ─── Base ─────────────────────────────────────────────────────────────────────
FROM node:20.14.0-alpine3.20 AS base
WORKDIR /app
COPY package.json package-lock.json ./

# ─── Dev ──────────────────────────────────────────────────────────────────────
# Cài full deps (nodemon + tsx có trong devDependencies)
# Source mount từ host qua volume → nodemon hot-reload
FROM base AS dev
RUN npm ci --prefer-offline
COPY . .
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser
EXPOSE 5001
CMD ["npm", "run", "dev:nodemon"]

# ─── Build ────────────────────────────────────────────────────────────────────
FROM base AS build
RUN npm ci --prefer-offline
COPY . .
RUN npm run build

# ─── Production (Jenkins → Docker Swarm) ──────────────────────────────────────
FROM node:20.14.0-alpine3.20 AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --prefer-offline
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/uploads ./dist/uploads
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser
EXPOSE 5001
CMD ["node", "dist/server.js"]
