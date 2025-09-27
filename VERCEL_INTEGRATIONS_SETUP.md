# Vercel Integrations Setup Guide

## Required Vercel Integrations for WorldHuman Studio

### 1. Vercel Postgres 🗄️

**Purpose**: Primary database for user data, tasks, submissions, and payments

#### Setup Steps:
1. **In Vercel Dashboard**:
   - Go to your project → Storage tab
   - Click "Create Database" → Select "Postgres"
   - Choose a database name: `worldhuman-studio-db`
   - Select region: `US East (iad1)` (matches your app region)

2. **Configuration**:
   ```bash
   # Environment variables automatically added by Vercel:
   POSTGRES_URL
   POSTGRES_URL_NON_POOLING
   POSTGRES_USER
   POSTGRES_HOST
   POSTGRES_PASSWORD
   POSTGRES_DATABASE
   ```

3. **Post-Setup**:
   - Run database schema setup using the SQL from `lib/db/schema.sql`
   - Verify connection with health check endpoint

#### Alternative: Neon Database
If you prefer Neon (recommended for better performance):
1. Create account at [neon.tech](https://neon.tech)
2. Create new project: "WorldHuman Studio"
3. Copy connection string to `DATABASE_URL`
4. Enable connection pooling

---

### 2. Vercel KV (Redis) 📊

**Purpose**: Session storage, rate limiting, and caching

#### Setup Steps:
1. **In Vercel Dashboard**:
   - Go to your project → Storage tab
   - Click "Create Database" → Select "KV"
   - Choose a database name: `worldhuman-sessions`
   - Select region: `US East (iad1)`

2. **Configuration**:
   ```bash
   # Environment variables automatically added by Vercel:
   KV_URL
   KV_REST_API_URL
   KV_REST_API_TOKEN
   KV_REST_API_READ_ONLY_TOKEN
   ```

3. **Usage in App**:
   - User session management
   - World ID verification rate limiting
   - Temporary data caching
   - Payment processing queues

---

### 3. Vercel Blob Storage 📁

**Purpose**: Audio file uploads for voice recording tasks

#### Setup Steps:
1. **In Vercel Dashboard**:
   - Go to your project → Storage tab
   - Click "Create Store" → Select "Blob"
   - Choose a store name: `worldhuman-audio`
   - Select region: `US East (iad1)`

2. **Configuration**:
   ```bash
   # Environment variable automatically added by Vercel:
   BLOB_READ_WRITE_TOKEN
   ```

3. **Storage Configuration**:
   - **Max file size**: 10MB (for audio recordings)
   - **Allowed file types**: `.mp3`, `.wav`, `.m4a`, `.ogg`
   - **Retention**: 30 days for temporary files
   - **Public access**: Disabled (authenticated access only)

---

### 4. Vercel Analytics 📈

**Purpose**: Performance monitoring and user analytics

#### Setup Steps:
1. **In Vercel Dashboard**:
   - Go to your project → Analytics tab
   - Enable "Web Analytics"
   - Enable "Speed Insights"

2. **Configuration**:
   ```bash
   # No environment variables needed
   # Analytics are automatically injected
   ```

3. **Features Enabled**:
   - Core Web Vitals monitoring
   - User session tracking
   - Performance metrics
   - Real User Monitoring (RUM)

---

### 5. Optional: Vercel Edge Config ⚡

**Purpose**: Dynamic configuration without redeployment

#### Setup Steps:
1. **In Vercel Dashboard**:
   - Go to your project → Storage tab
   - Click "Create Store" → Select "Edge Config"
   - Choose a store name: `worldhuman-config`

2. **Use Cases**:
   - Feature flags
   - Task reward rates
   - Maintenance mode toggles
   - Regional restrictions

---

## Integration Commands

### Setup via Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Create Postgres database
vercel postgres create worldhuman-studio-db

# Create KV store
vercel kv create worldhuman-sessions

# Create Blob store
vercel blob create worldhuman-audio

# Pull environment variables
vercel env pull .env.production
```

### Database Schema Deployment
```bash
# After Postgres is created, run:
vercel env pull .env.local
npm run setup:db

# Or manually execute SQL:
psql $POSTGRES_URL < lib/db/schema.sql
```

---

## Integration Testing

### Test Database Connection
```javascript
// /api/test/database
import { db } from '@/lib/db/client';

export async function GET() {
  try {
    const result = await db`SELECT 1 as test`;
    return Response.json({
      status: 'connected',
      result: result[0]
    });
  } catch (error) {
    return Response.json({
      status: 'error',
      error: error.message
    }, { status: 500 });
  }
}
```

### Test KV Connection
```javascript
// /api/test/kv
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    await kv.set('test', 'connected');
    const result = await kv.get('test');
    return Response.json({
      status: 'connected',
      result
    });
  } catch (error) {
    return Response.json({
      status: 'error',
      error: error.message
    }, { status: 500 });
  }
}
```

### Test Blob Storage
```javascript
// /api/test/blob
import { put } from '@vercel/blob';

export async function POST(request) {
  try {
    const { url } = await put('test.txt', 'Hello World', {
      access: 'public',
    });
    return Response.json({
      status: 'connected',
      url
    });
  } catch (error) {
    return Response.json({
      status: 'error',
      error: error.message
    }, { status: 500 });
  }
}
```

---

## Cost Optimization

### Postgres Optimization
- Use connection pooling (already configured)
- Implement query optimization
- Monitor connection usage
- Set up read replicas for heavy read operations

### KV Optimization
- Set appropriate TTL values
- Use compression for large values
- Monitor memory usage
- Implement cache invalidation strategies

### Blob Storage Optimization
- Implement automatic cleanup of old files
- Use appropriate compression for audio files
- Set up lifecycle policies
- Monitor storage usage

---

## Monitoring & Alerts

### Set up monitoring for:
1. **Database performance**
   - Connection pool utilization
   - Query execution times
   - Error rates

2. **KV performance**
   - Memory usage
   - Hit/miss ratios
   - Response times

3. **Blob storage**
   - Upload success rates
   - Storage usage
   - Download performance

### Alert Thresholds:
- Database connections > 80% of limit
- KV memory usage > 90%
- Blob upload failures > 5%
- Response times > 2 seconds

---

## Security Configuration

### Database Security
- ✅ SSL/TLS encryption enabled
- ✅ Connection string secured in environment variables
- ✅ SQL injection protection implemented
- ✅ Row-level security policies (if needed)

### KV Security
- ✅ Access tokens secured
- ✅ Read-only tokens for read operations
- ✅ TTL policies for sensitive data
- ✅ Access pattern monitoring

### Blob Security
- ✅ Private access by default
- ✅ Signed URLs for temporary access
- ✅ File type validation
- ✅ Size limits enforced

---

## Backup & Recovery

### Database Backups
- Automated daily backups (Vercel Postgres feature)
- Manual backup before major updates
- Point-in-time recovery available

### KV Backups
- No automatic backups (by design)
- Implement application-level backup for critical data
- Use Redis persistence for important cache data

### Blob Backups
- Files are automatically replicated
- Implement application-level cleanup
- Consider external backup for long-term storage

---

## Migration Guide

### From Development to Production
1. **Database Migration**:
   ```bash
   # Export development data
   pg_dump $DEV_DATABASE_URL > dev_backup.sql

   # Import to production
   psql $PROD_DATABASE_URL < dev_backup.sql
   ```

2. **KV Migration**:
   ```bash
   # No migration needed (session data is temporary)
   # Application will recreate sessions as needed
   ```

3. **Blob Migration**:
   ```bash
   # Files can be copied if needed
   # Most audio files are temporary and can be regenerated
   ```

---

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check connection string format
echo $POSTGRES_URL

# Test connection manually
psql $POSTGRES_URL -c "SELECT 1;"

# Check Vercel function logs
vercel logs
```

#### KV Connection Issues
```bash
# Verify environment variables
echo $KV_REST_API_URL
echo $KV_REST_API_TOKEN

# Test with curl
curl -H "Authorization: Bearer $KV_REST_API_TOKEN" \
     $KV_REST_API_URL/get/test
```

#### Blob Upload Issues
```bash
# Check token permissions
echo $BLOB_READ_WRITE_TOKEN

# Verify file size limits
# Check CORS configuration
```

---

## Support Resources

- [Vercel Storage Documentation](https://vercel.com/docs/storage)
- [Vercel Postgres Guide](https://vercel.com/docs/storage/vercel-postgres)
- [Vercel KV Guide](https://vercel.com/docs/storage/vercel-kv)
- [Vercel Blob Guide](https://vercel.com/docs/storage/vercel-blob)
- [Vercel Support](https://vercel.com/support)

---

*Last updated: September 26, 2025*