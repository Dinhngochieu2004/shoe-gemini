#!/bin/bash
# First-time Certbot certificate issuance for production VPS
# Usage: bash nginx/certbot-init.sh YOUR_DOMAIN your@email.com
#
# Prerequisites:
#   - Docker + docker compose installed on VPS
#   - Domain DNS A record already pointing to this server IP
#   - Port 80 open (for ACME challenge)

set -e

DOMAIN="${1:?Usage: $0 DOMAIN EMAIL}"
EMAIL="${2:?Usage: $0 DOMAIN EMAIL}"

echo "==> Issuing certificate for $DOMAIN (email: $EMAIL)"

docker compose run --rm --entrypoint "certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  -d $DOMAIN \
  -d www.$DOMAIN" certbot

echo ""
echo "==> Certificate issued. Apply production config:"
echo "    sed -i 's/YOUR_DOMAIN/$DOMAIN/g' nginx/default.prod.conf"
echo "    cp nginx/default.prod.conf nginx/default.conf"
echo "    docker compose restart nginx"
