#!/bin/bash
# First-time Certbot certificate issuance for production VPS
# Usage: bash nginx/certbot-init.sh YOUR_DOMAIN your@email.com
#
# Prerequisites:
#   - Docker + docker compose installed on VPS
#   - Domain DNS A record already pointing to this server IP
#   - Port 80 open (for ACME challenge)
#   - Run from project root directory

set -e

DOMAIN="${1:?Usage: $0 DOMAIN EMAIL}"
EMAIL="${2:?Usage: $0 DOMAIN EMAIL}"

echo "==> [1/3] Starting nginx (HTTP only) to serve ACME challenge..."
docker compose up -d nginx

echo "==> [2/3] Issuing certificate for $DOMAIN and www.$DOMAIN (email: $EMAIL)..."
docker compose --profile certbot run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

echo ""
echo "==> [3/3] Certificate issued successfully!"
echo ""
echo "    Next steps — deploy to Docker Swarm:"
echo "    1. Create Docker secrets (mongo_uri, redis_uri, jwt_access_key, ...)"
echo "    2. docker stack deploy -c docker-stack.yml shoe"
echo ""
echo "    To renew manually: docker compose --profile certbot run --rm certbot renew"
