#!/usr/bin/env bash
set -euo pipefail

AWS_ACCOUNT_ID="<YOUR_ACCOUNT_ID>"
AWS_REGION="<YOUR_REGION>"

echo "Logging into ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin \
  "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

cd /home/ubuntu/auto-blog/infra

echo "Pulling latest images..."
docker compose -f docker-compose.prod.yml pull

echo "Starting containers..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

echo "Deployment completed."
