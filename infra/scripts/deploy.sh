#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="eu-west-2"
AWS_ACCOUNT_ID="206492233485"
ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

SSM_PREFIX="/assimetria/blog"

echo "Fetching secrets from SSM Parameter Store..."

# Fetch all parameters in a single call (less chatty)
PARAMS_JSON=$(aws ssm get-parameters \
  --names \
    "$SSM_PREFIX/DB_USER" \
    "$SSM_PREFIX/DB_PASSWORD" \
    "$SSM_PREFIX/DB_NAME" \
    "$SSM_PREFIX/AI_API_KEY" \
  --with-decryption \
  --region "$AWS_REGION" \
  --output json)

get_param() {
  local name="$1"
  echo "$PARAMS_JSON" | jq -r \
    --arg n "$name" \
    '.Parameters[] | select(.Name == $n) | .Value'
}

export DB_USER
export DB_PASSWORD
export DB_NAME
export AI_API_KEY

DB_USER=$(get_param "$SSM_PREFIX/DB_USER")
DB_PASSWORD=$(get_param "$SSM_PREFIX/DB_PASSWORD")
DB_NAME=$(get_param "$SSM_PREFIX/DB_NAME")
AI_API_KEY=$(get_param "$SSM_PREFIX/AI_API_KEY")

if [[ -z "$DB_USER" || -z "$DB_PASSWORD" || -z "$DB_NAME" ]]; then
  echo "Missing DB_* values from SSM, aborting." >&2
  exit 1
fi

echo "Secrets loaded into environment."

# Login to ECR
echo "Logging into ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ECR_REGISTRY"

cd "$(dirname "$0")"

echo "Pulling latest images..."
docker compose -f ../docker-compose.prod.yml pull

echo "Starting containers..."
docker compose -f ../docker-compose.prod.yml up -d --remove-orphans

echo "Deployment complete."
