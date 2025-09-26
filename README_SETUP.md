# WorldHuman Studio App - Setup Guide

## 🚀 Quick Setup

### Prerequisites
- Node.js 18+ and npm/pnpm
- PostgreSQL client (`psql`) for database setup
- Neon account (free tier works)
- World App Developer account
- Vercel account (for deployment)

### 1️⃣ Database Setup (Neon)

1. **Create Neon Project**:
   - Go to [Neon Console](https://console.neon.tech/)
   - Create new project named "whstudio"
   - Choose your region (us-east-2 recommended)
   - Copy the connection string

2. **Update Environment**:
   ```bash
   # Edit .env.local and replace DATABASE_URL with your connection string
   DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-YOUR-ENDPOINT.us-east-2.aws.neon.tech/whstudio?sslmode=require"
   ```

### 2️⃣ World ID Configuration

1. **Get World App ID**:
   - Visit [World Developer Portal](https://developer.worldcoin.org)
   - Create new app or use existing
   - Copy your App ID (format: `app_staging_xxxxx`)

2. **Update Environment**:
   ```bash
   NEXT_PUBLIC_APP_ID="app_staging_YOUR_APP_ID"
   ```

### 3️⃣ Generate Secrets

```bash
# Run the secret generation script
npm run generate:secrets

# Copy the output and update your .env.local file
```

### 4️⃣ Initialize Database

```bash
# Run database setup (creates all tables)
npm run setup:db
```

### 5️⃣ Vercel KV Setup (for sessions)

1. **Create KV Database**:
   - Go to Vercel Dashboard > Storage
   - Create new KV database
   - Copy connection details

2. **Update Environment**:
   ```bash
   KV_URL="redis://..."
   KV_REST_API_URL="https://..."
   KV_REST_API_TOKEN="..."
   ```

### 6️⃣ Start Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## 📝 Environment Variables

Create `.env.local` with all required variables:

```env
# Database
DATABASE_URL="postgresql://..."
DATABASE_URL_NON_POOLING="postgresql://..."

# World ID
NEXT_PUBLIC_APP_ID="app_staging_..."
WORLD_ACTION_ID="verify_human"

# Authentication (generate with npm run generate:secrets)
AUTH_SECRET="..."
HMAC_SECRET_KEY="..."
JWT_SECRET="..."

# Vercel KV
KV_URL="..."
KV_REST_API_URL="..."
KV_REST_API_TOKEN="..."

# Vercel Blob
BLOB_READ_WRITE_TOKEN="..."

# Payment
PAYMENT_WEBHOOK_SECRET="..."
```

## 🧪 Testing

### World ID Testing
1. Use [World Simulator](https://simulator.worldcoin.org) for development
2. Test verification flow without real World ID

### Local Development
```bash
# Run with test data
npm run dev

# Access at http://localhost:3000
```

## 🚢 Deployment

### Deploy to Vercel

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial WorldHuman Studio App"
   git push origin main
   ```

2. **Import to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/new)
   - Import GitHub repository
   - Add all environment variables
   - Deploy

3. **Configure Production**:
   - Update `AUTH_URL` to production domain
   - Enable Vercel KV and Blob storage
   - Set up custom domain

## 📱 World App Integration

### Submit to World App Store

1. **Prepare Manifest**:
   - Update `/public/manifest.json` with your app details
   - Add app icon and screenshots

2. **Submit for Review**:
   - Go to World Developer Portal
   - Submit app for review
   - Wait for approval (usually 24-48 hours)

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT 1"

# Check if tables exist
psql "$DATABASE_URL" -c "\dt"
```

### World ID Verification Fails
- Check App ID is correct in `.env.local`
- Ensure you're using staging ID for development
- Test with World Simulator first

### Session Issues
- Verify KV database is configured
- Check KV tokens are valid
- Clear browser cookies and retry

## 📚 Resources

- [World ID Docs](https://docs.world.org/mini-apps)
- [Neon Docs](https://neon.tech/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Project GitHub](https://github.com/nbelthan/whstudio-app)

## 🤝 Support

- GitHub Issues: [Report bugs](https://github.com/nbelthan/whstudio-app/issues)
- Documentation: [WorldHuman Docs](https://docs.worldhuman.studio)
- Discord: Coming soon

---

Ready to build the future of human-verified AI training data! 🚀