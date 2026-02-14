#!/usr/bin/env bash
set -e

echo "==> SplitEase Setup"
echo ""

# 1. Check prerequisites
for cmd in docker node npm; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: $cmd is not installed. Please install it first."
    exit 1
  fi
done

# 2. Create .env if missing
if [ ! -f .env ]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
  echo "    Edit .env to set your NEXT_PUBLIC_PRIVY_APP_ID"
fi

# 3. Start PostgreSQL container
echo "==> Starting PostgreSQL container..."
docker compose up -d db
echo "    Waiting for Postgres to be ready..."
until docker compose exec db pg_isready -U postgres &>/dev/null; do
  sleep 1
done
echo "    Postgres is ready."

# 4. Install Node dependencies
echo "==> Installing dependencies..."
npm install

# 5. Generate Prisma client & run migrations
echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Running database migrations..."
npx prisma migrate dev --name init

echo ""
echo "==> Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Set your Privy App ID in .env (NEXT_PUBLIC_PRIVY_APP_ID)"
echo "  2. Run: npm run dev"
echo "  3. Open: http://localhost:3000"
