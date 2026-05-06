#!/bin/bash
set -e

echo "→ Pulling latest code..."
git pull origin main

echo "→ Rebuilding frontend..."
docker compose -f docker-compose.prod.yml --profile build run --rm frontend-build

echo "→ Rebuilding and restarting backend..."
docker compose -f docker-compose.prod.yml up -d --build backend

echo "→ Reloading Nginx..."
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "✓ Deploy complete"