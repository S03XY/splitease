#!/usr/bin/env bash
set -e

echo "🗑️  Resetting Supabase Database..."
echo ""

# Load environment variables
export $(grep -v '^#' .env | xargs)

if [ -z "$DIRECT_URL" ]; then
  echo "❌ Error: DIRECT_URL not found in .env"
  exit 1
fi

echo "⚠️  WARNING: This will DELETE ALL DATA in your database!"
echo "   Database: $(echo $DIRECT_URL | sed 's/:.*@/ ... @/g')"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation

if [ "$confirmation" != "yes" ]; then
  echo "❌ Reset cancelled"
  exit 0
fi

echo ""
echo "🧹 Step 1: Dropping all tables..."

# Reset Prisma migrations (using DIRECT_URL to bypass PgBouncer)
DATABASE_URL="$DIRECT_URL" npx prisma migrate reset --force

echo ""
echo "✅ Database reset complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Run './setup.sh' to recreate the schema"
echo "   2. Restart your dev server if it's running"
echo ""
