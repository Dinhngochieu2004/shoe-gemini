# syntax=docker/dockerfile:1

# ─── Dependencies ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --loglevel error --no-fund --no-audit

# ─── Dev ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS dev
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY public ./public
COPY src ./src
EXPOSE 3000
CMD ["npm", "start"]

# ─── Build ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY public ./public
COPY src ./src
# Production defaults — Jenkins builds without --build-arg will use these.
# For local swarm test: docker build --build-arg REACT_APP_SERVER=http://localhost ...
ARG REACT_APP_SERVER=https://giaythethao.click
ARG REACT_APP_IMG=https://giaythethao.click/uploads
ENV REACT_APP_SERVER=$REACT_APP_SERVER \
    REACT_APP_IMG=$REACT_APP_IMG
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
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost/ > /dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
