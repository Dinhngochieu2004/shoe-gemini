# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --loglevel error --no-fund --no-audit

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY public ./public
COPY src ./src
ARG REACT_APP_SERVER=https://giaythethao.click
ARG REACT_APP_IMG=https://giaythethao.click/uploads
ENV REACT_APP_SERVER=$REACT_APP_SERVER REACT_APP_IMG=$REACT_APP_IMG
RUN npm run build

FROM nginx:stable-alpine AS production
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /usr/share/nginx/html \
    && touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid
COPY --from=build --chown=nginx:nginx /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
USER nginx
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:8080/ > /dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
