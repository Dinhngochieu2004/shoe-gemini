# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --loglevel error --no-fund --no-audit
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --prefer-offline --loglevel error --no-fund --no-audit \
    && addgroup -S app && adduser -S app -G app \
    && mkdir -p /app/dist/uploads && chown -R app:app /app
COPY --from=build --chown=app:app /app/dist ./dist
USER app
EXPOSE 5001
CMD ["node", "dist/server.js"]
