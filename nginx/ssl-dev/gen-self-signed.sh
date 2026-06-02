#!/bin/sh
# Generate self-signed SSL certificate for local development
# Usage: sh nginx/ssl-dev/gen-self-signed.sh

CERT_DIR="nginx/ssl-dev"

mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout "$CERT_DIR/self-signed.key" \
  -out    "$CERT_DIR/self-signed.crt" \
  -subj "/C=VN/ST=HCM/L=HoChiMinh/O=ShoeGemini/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Self-signed certificate generated in $CERT_DIR/"
echo "  -> self-signed.crt"
echo "  -> self-signed.key"
