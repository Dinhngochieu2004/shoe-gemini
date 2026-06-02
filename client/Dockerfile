# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20.14.0-alpine3.20 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20.14.0-alpine3.20 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ─── Stage 3: Production ──────────────────────────────────────────────────────
FROM nginx:1.27.0-alpine3.19 AS production

# Non-root: tạo user và cấp quyền các thư mục nginx cần ghi
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup \
        /var/cache/nginx \
        /var/log/nginx \
        /usr/share/nginx/html \
    && touch /var/run/nginx.pid \
    && chown appuser:appgroup /var/run/nginx.pid

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

USER appuser

CMD ["nginx", "-g", "daemon off;"]
