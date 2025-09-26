#!/bin/bash

echo "🔐 Generating secure secrets for WorldHuman Studio"
echo "=================================================="
echo ""

# Generate AUTH_SECRET
AUTH_SECRET=$(openssl rand -base64 32)
echo "✅ Generated AUTH_SECRET"

# Generate HMAC_SECRET_KEY
HMAC_SECRET=$(openssl rand -base64 32)
echo "✅ Generated HMAC_SECRET_KEY"

# Generate JWT_SECRET
JWT_SECRET=$(openssl rand -base64 32)
echo "✅ Generated JWT_SECRET"

# Generate PAYMENT_WEBHOOK_SECRET
WEBHOOK_SECRET=$(openssl rand -base64 32)
echo "✅ Generated PAYMENT_WEBHOOK_SECRET"

echo ""
echo "📝 Add these to your .env.local file:"
echo "======================================"
echo ""
echo "AUTH_SECRET=\"$AUTH_SECRET\""
echo "HMAC_SECRET_KEY=\"$HMAC_SECRET\""
echo "JWT_SECRET=\"$JWT_SECRET\""
echo "PAYMENT_WEBHOOK_SECRET=\"$WEBHOOK_SECRET\""
echo ""
echo "⚠️  Keep these secrets secure and never commit them to git!"