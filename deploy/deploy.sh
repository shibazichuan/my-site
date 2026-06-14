#!/bin/bash
set -e
cd /opt/my-site
git pull origin master
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d --build
docker exec my-site-backend-1 alembic upgrade head
echo "Deployed! $(date)"
