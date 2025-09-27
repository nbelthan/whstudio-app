# Database Integration Guide

## Overview
The app currently runs in demo mode with mock data. Here's how to connect it to a real PostgreSQL database for production use.

## Current Demo Mode Architecture

### Demo Features
- Mock MT-Bench tasks loaded from `/data/mt-bench-tasks.json`
- User earnings stored in localStorage
- Instant approval and reward crediting
- No authentication required

### Demo Limitations
- Data doesn't persist across devices
- No real payment processing
- Single user experience
- No admin functionality

## Production Database Setup

### 1. Prerequisites
```bash
# Install PostgreSQL
brew install postgresql # macOS
sudo apt-get install postgresql # Ubuntu

# Start PostgreSQL
brew services start postgresql # macOS
sudo systemctl start postgresql # Ubuntu
```

### 2. Database Schema
The database schema is already defined in `/prisma/schema.prisma`:
- **users**: World ID verified users with wallet addresses
- **tasks**: RLHF and data labeling tasks
- **submissions**: User task submissions
- **payments**: Payment records and escrow
- **categories**: Task categorization

### 3. Environment Variables
Create `.env.local` with real database credentials:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/worldhuman_studio"
DATABASE_URL_NON_POOLING="postgresql://username:password@localhost:5432/worldhuman_studio"

# World App Integration
WORLD_APP_ID="app_staging_..."
WORLD_ACTION="verify-human"

# Payment Configuration
PAYMENT_PROVIDER="worldchain"
USDC_CONTRACT_ADDRESS="0x..."
WLD_CONTRACT_ADDRESS="0x..."
```

### 4. Migration Steps

#### Step 1: Initialize Database
```bash
# Create database
createdb worldhuman_studio

# Run migrations
npx prisma migrate deploy

# Seed initial data
npx prisma db seed
```

#### Step 2: Update API Routes
Remove demo mode checks from API routes:

**`/api/tasks/route.ts`**
```typescript
// Replace mock data loading with:
import { queries } from '@/lib/db';

export async function GET(req: NextRequest) {
  const tasks = await queries.tasks.findAll({
    status: 'active',
    limit: 50
  });
  return NextResponse.json({ tasks });
}
```

**`/api/tasks/[id]/submit/route.ts`**
```typescript
// Replace instant approval with:
import { withAuth } from '@/lib/session';

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    const submission = await queries.submissions.create({
      user_id: user.id,
      task_id: taskId,
      submission_data,
      status: 'pending' // Requires admin review
    });

    // Queue for review
    await queueForReview(submission.id);

    return NextResponse.json({
      success: true,
      submission
    });
  });
}
```

#### Step 3: Enable Authentication
Update `/app/dashboard/page.tsx`:
```typescript
// Replace mock user with:
const response = await fetch('/api/auth/session');
const { user } = await response.json();

if (!user) {
  router.push('/'); // Redirect to login
}
```

#### Step 4: Implement Payment Processing
Update payment flow to use real World Chain:
```typescript
// In submission approval flow
if (submission.status === 'approved') {
  await processPayment({
    recipient: user.wallet_address,
    amount: task.reward_amount,
    currency: task.reward_currency,
    network: 'worldchain'
  });
}
```

### 5. Admin Panel Setup
Enable the admin panel at `/admin`:
1. Set admin user in database: `UPDATE users SET is_admin = true WHERE world_id = 'your_world_id'`
2. Admin can review submissions and approve payments
3. Dashboard shows real-time stats from database

### 6. World ID Integration
Enable real World ID verification:
```typescript
// In MiniKitProvider
const minikit = new MiniKit({
  appId: process.env.WORLD_APP_ID,
  walletAuth: true,
  commandGroups: ['identity', 'wallet'],
  environment: 'production' // Change from 'staging'
});
```

### 7. Monitoring & Analytics
Add production monitoring:
```typescript
// Add to API routes
import { logger } from '@/lib/logger';

logger.info('Task submitted', {
  userId: user.id,
  taskId,
  timestamp: new Date()
});
```

## Testing Production Mode

1. **Local Testing**
```bash
# Use production environment
NODE_ENV=production npm run dev

# Test with local database
DATABASE_URL="postgresql://localhost/worldhuman_test" npm run dev
```

2. **Staging Deployment**
```bash
# Deploy to Vercel staging
vercel --env preview

# Set environment variables in Vercel dashboard
```

3. **Production Checklist**
- [ ] Database migrations complete
- [ ] Environment variables set
- [ ] World ID verification working
- [ ] Payment processing tested
- [ ] Admin panel accessible
- [ ] Error logging configured
- [ ] Rate limiting enabled
- [ ] Security headers added

## Migration from Demo to Production

### Data Migration
If you have demo users you want to preserve:
```javascript
// Migration script
const demoEarnings = localStorage.getItem('demo_total_earned');
const demoCount = localStorage.getItem('demo_submission_count');

// Create user account with preserved stats
await createUser({
  world_id: verifiedWorldId,
  total_earned: demoEarnings,
  submission_count: demoCount
});
```

### Gradual Rollout
1. Start with read-only database connection
2. Enable authentication for new users
3. Migrate existing demo users
4. Enable payment processing
5. Activate admin review workflow

## Security Considerations

### Required Security Updates
1. **Input Validation**: Add Zod schemas for all API inputs
2. **Rate Limiting**: Implement rate limiting on submission endpoints
3. **CORS**: Configure CORS for World App domain only
4. **CSP Headers**: Add Content Security Policy headers
5. **SQL Injection**: Use parameterized queries (already in place with Prisma)
6. **XSS Protection**: Sanitize user-generated content

### Payment Security
- Never store private keys in code
- Use environment variables for contract addresses
- Implement payment confirmation webhooks
- Add transaction monitoring and alerts

## Support & Troubleshooting

### Common Issues
1. **Database Connection Failed**: Check DATABASE_URL format and credentials
2. **World ID Not Verifying**: Ensure WORLD_APP_ID matches your app registration
3. **Payments Not Processing**: Verify wallet has sufficient gas for transactions
4. **Admin Panel 403**: Confirm user is marked as admin in database

### Getting Help
- Database issues: Check Prisma documentation
- World ID issues: Visit docs.world.org
- Payment issues: Check World Chain documentation
- General issues: Open issue on GitHub

## Next Steps
1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Test authentication flow
5. Configure payment processing
6. Deploy to staging
7. Complete security audit
8. Launch to production