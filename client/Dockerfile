# syntax=docker/dockerfile:1

# ─── Dependencies ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps

# ─── Dev ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
EXPOSE 3000
CMD ["npm", "start"]

# ─── Build ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ─── Production ───────────────────────────────────────────────────────────────
FROM nginx:stable-alpine AS production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup \
        /var/cache/nginx \
        /var/log/nginx \
        /usr/share/nginx/html \
    && touch /var/run/nginx.pid \
    && chown appuser:appgroup /var/run/nginx.pid

COPY --chown=appuser:appgroup --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
USER appuser
CMD ["nginx", "-g", "daemon off;"]
