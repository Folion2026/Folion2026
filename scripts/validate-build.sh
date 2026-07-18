#!/bin/sh
set -eu

# Isolated build validation only: this does not start, restart, or deploy services.
validation_url=${VITE_SUPABASE_URL:-http://127.0.0.1}
validation_key=${VITE_SUPABASE_PUBLISHABLE_KEY:-build-validation}

docker build \
  --build-arg "VITE_SUPABASE_URL=${validation_url}" \
  --build-arg "VITE_SUPABASE_PUBLISHABLE_KEY=${validation_key}" \
  --target build \
  -t folion-frontend-validation:local .
docker build --target build -t folion-api-validation:local ./api
docker build --target build -t folion-worker-validation:local ./worker

SUPABASE_URL=${SUPABASE_URL:-http://127.0.0.1} \
SUPABASE_SECRET_KEY=${SUPABASE_SECRET_KEY:-build-validation} \
GEMINI_API_KEY=${GEMINI_API_KEY:-build-validation} \
GEMINI_MODEL=${GEMINI_MODEL:-build-validation} \
VITE_SUPABASE_URL=${validation_url} \
VITE_SUPABASE_PUBLISHABLE_KEY=${validation_key} \
docker compose config --quiet

echo "Frontend, API, worker, and Docker Compose validation passed."
