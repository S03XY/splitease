#!/usr/bin/env bash
set -e

echo "=== SplitEase — Supabase Database Setup ==="
echo ""

# 1. Check .env exists
if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Create it with DATABASE_URL and DIRECT_URL first."
  exit 1
fi

# 2. Load .env variables into shell
export $(grep -v '^#' .env | xargs)

# 3. Check for placeholder password
if grep -q '\[YOUR-PASSWORD\]' .env; then
  echo "ERROR: Replace [YOUR-PASSWORD] in .env with your actual Supabase password."
  exit 1
fi

# 3. Install dependencies
echo "[1/4] Installing dependencies..."
npm install

# 4. Push schema to Supabase (use DIRECT_URL to bypass PgBouncer)
echo ""
echo "[2/4] Pushing schema to Supabase..."
DATABASE_URL="$DIRECT_URL" npx prisma db push

# 5. Generate Prisma client
echo ""
echo "[3/4] Generating Prisma client..."
npx prisma generate

# 6. Verify connection
echo ""
echo "[4/4] Verifying connection..."
DATABASE_URL="$DIRECT_URL" npx prisma db execute --stdin <<< "SELECT 1;"

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Run: npm run dev"
echo "  2. Open: http://localhost:3000"
