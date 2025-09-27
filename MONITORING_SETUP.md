# Monitoring & Alerting Setup Guide

## 📊 Comprehensive Monitoring Strategy for WorldHuman Studio

### Overview
This guide establishes a multi-layered monitoring approach covering infrastructure, application performance, user experience, and business metrics.

---

## 🔧 Core Monitoring Stack

### 1. Vercel Analytics (Built-in)
**Purpose**: Core Web Vitals and performance monitoring

**Features**:
- ✅ Page load performance
- ✅ Core Web Vitals (LCP, FID, CLS)
- ✅ User session tracking
- ✅ Geographic performance data
- ✅ Real User Monitoring (RUM)

**Setup**: Automatically enabled with Vercel deployment

```javascript
// Optional: Custom events tracking
import { track } from '@vercel/analytics';

// Track custom events
track('World ID Verification', {
  verification_level: 'orb',
  success: true,
  duration: 1250
});

track('Task Completion', {
  task_type: 'voice_recording',
  submission_id: 'sub_123',
  earnings: 0.5
});
```

### 2. Sentry Error Tracking (Recommended)
**Purpose**: Comprehensive error monitoring and performance tracking

#### Setup:
```bash
npm install @sentry/nextjs
```

#### Configuration:
```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.BrowserTracing({
      beforeNavigate: context => ({
        ...context,
        name: location.pathname
      })
    })
  ],
  beforeSend(event) {
    // Filter out sensitive data
    if (event.exception) {
      const error = event.exception.values[0];
      if (error.value?.includes('nullifier_hash')) {
        return null; // Don't send World ID data
      }
    }
    return event;
  }
});
```

#### Custom Error Tracking:
```javascript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs';

export function trackError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    tags: {
      component: context?.component || 'unknown',
      feature: context?.feature || 'general'
    },
    extra: context
  });
}

export function trackWorldIDError(error: Error, verification_level: string) {
  Sentry.captureException(error, {
    tags: {
      component: 'world_id_verification',
      verification_level
    },
    fingerprint: ['world-id-error', error.message]
  });
}
```

### 3. LogRocket Session Replay (Optional)
**Purpose**: User session recording for debugging

#### Setup:
```bash
npm install logrocket logrocket-react
```

#### Configuration:
```javascript
// lib/logrocket.ts
import LogRocket from 'logrocket';

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  LogRocket.init(process.env.NEXT_PUBLIC_LOGROCKET_APP_ID);

  // Privacy settings for World App
  LogRocket.getSessionURL(sessionURL => {
    // Send to your analytics or error reporting
    console.log('LogRocket session:', sessionURL);
  });
}

// Identify users (without PII)
export function identifyUser(worldId: string) {
  LogRocket.identify(worldId, {
    // Don't include nullifier_hash or other sensitive data
    user_type: 'verified_human',
    platform: 'world_app'
  });
}
```

---

## 🚨 Alert Configuration

### 1. Application Health Alerts

#### Error Rate Alerts
```javascript
// /api/health
export async function GET() {
  const healthChecks = await Promise.allSettled([
    checkDatabaseHealth(),
    checkWorldIDService(),
    checkStorageHealth(),
    checkKVHealth()
  ]);

  const failedServices = healthChecks
    .map((result, index) => ({ result, service: ['db', 'worldid', 'storage', 'kv'][index] }))
    .filter(({ result }) => result.status === 'rejected')
    .map(({ service }) => service);

  const healthStatus = failedServices.length === 0 ? 'healthy' : 'degraded';

  return Response.json({
    status: healthStatus,
    timestamp: new Date().toISOString(),
    failed_services: failedServices,
    uptime: process.uptime()
  });
}
```

#### Performance Thresholds
```javascript
// lib/performance-monitoring.ts
export function monitorAPIPerformance(endpoint: string, duration: number) {
  // Alert if response time > 2 seconds
  if (duration > 2000) {
    trackError(new Error(`Slow API response: ${endpoint}`), {
      duration,
      endpoint,
      threshold: 2000
    });
  }

  // Track to analytics
  track('API Performance', {
    endpoint,
    duration,
    status: duration > 2000 ? 'slow' : 'normal'
  });
}
```

### 2. Business Metrics Alerts

#### World ID Verification Monitoring
```javascript
// lib/business-monitoring.ts
export async function trackVerificationMetrics() {
  const metrics = await db`
    SELECT
      COUNT(*) as total_verifications,
      COUNT(*) FILTER (WHERE verification_level = 'orb') as orb_verifications,
      COUNT(*) FILTER (WHERE verification_level = 'device') as device_verifications,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as recent_verifications
    FROM users
    WHERE created_at > NOW() - INTERVAL '24 hours'
  `;

  const hourlyRate = metrics[0].recent_verifications;

  // Alert if verification rate drops significantly
  if (hourlyRate < 5) { // Adjust threshold based on your traffic
    trackError(new Error('Low verification rate detected'), {
      hourly_rate: hourlyRate,
      total_24h: metrics[0].total_verifications
    });
  }

  return metrics[0];
}
```

#### Payment System Monitoring
```javascript
export async function trackPaymentMetrics() {
  const metrics = await db`
    SELECT
      COUNT(*) as total_payments,
      COUNT(*) FILTER (WHERE status = 'completed') as successful_payments,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_payments,
      AVG(amount) as average_amount
    FROM payments
    WHERE created_at > NOW() - INTERVAL '1 hour'
  `;

  const successRate = metrics[0].successful_payments / metrics[0].total_payments;

  // Alert if payment success rate < 95%
  if (successRate < 0.95) {
    trackError(new Error('Payment success rate below threshold'), {
      success_rate: successRate,
      failed_count: metrics[0].failed_payments
    });
  }

  return metrics[0];
}
```

---

## 📈 Custom Dashboards

### 1. Vercel Functions Dashboard
Monitor your serverless functions performance:

#### Key Metrics:
- Function execution duration
- Memory usage
- Error rates
- Cold start frequency
- Invocation count

### 2. Database Performance Dashboard
Monitor Postgres performance:

```sql
-- Slow query monitoring
SELECT
    query,
    mean_exec_time,
    calls,
    total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;

-- Connection monitoring
SELECT
    count(*) as active_connections,
    max_conn,
    (count(*) * 100) / max_conn as connection_usage_percent
FROM pg_stat_activity,
     (SELECT setting::int as max_conn FROM pg_settings WHERE name = 'max_connections') mc;
```

### 3. User Experience Dashboard
Track user journey metrics:

```javascript
// Track user flow completion rates
export function trackUserJourney(step: string, userId: string) {
  track('User Journey', {
    step,
    user_id: userId,
    timestamp: Date.now()
  });
}

// Monitor World ID verification funnel
export function trackVerificationFunnel(stage: string, success: boolean) {
  track('Verification Funnel', {
    stage, // 'initiated', 'proof_generated', 'verified', 'user_created'
    success,
    timestamp: Date.now()
  });
}
```

---

## 🎯 Key Performance Indicators (KPIs)

### Technical KPIs
1. **Uptime**: Target > 99.9%
2. **Response Time**: Target < 500ms (p95)
3. **Error Rate**: Target < 1%
4. **Database Query Time**: Target < 100ms (p95)

### Business KPIs
1. **World ID Verification Success Rate**: Target > 95%
2. **Task Completion Rate**: Target > 85%
3. **Payment Success Rate**: Target > 98%
4. **User Retention**: 7-day retention > 40%

### User Experience KPIs
1. **Core Web Vitals**:
   - LCP (Largest Contentful Paint): < 2.5s
   - FID (First Input Delay): < 100ms
   - CLS (Cumulative Layout Shift): < 0.1

---

## 🔔 Notification Channels

### 1. Slack Integration
```javascript
// lib/slack-notifications.ts
export async function sendSlackAlert(message: string, severity: 'info' | 'warning' | 'error') {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const colors = {
    info: '#36a64f',
    warning: '#ff9900',
    error: '#ff0000'
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachments: [{
        color: colors[severity],
        fields: [{
          title: 'WorldHuman Studio Alert',
          value: message,
          short: false
        }],
        ts: Math.floor(Date.now() / 1000)
      }]
    })
  });
}
```

### 2. Email Notifications
Set up email alerts for critical issues using Vercel's environment variables:

```javascript
// For critical errors
export async function sendCriticalAlert(error: Error, context: any) {
  // Send to Sentry
  trackError(error, context);

  // Send Slack notification
  await sendSlackAlert(
    `Critical Error: ${error.message}\nContext: ${JSON.stringify(context)}`,
    'error'
  );
}
```

---

## 📊 Monitoring Endpoints

### Health Check Endpoint
```javascript
// /api/monitoring/health
export async function GET() {
  const checks = await Promise.allSettled([
    checkDatabaseHealth(),
    checkWorldIDService(),
    checkStorageHealth(),
    checkKVHealth()
  ]);

  const results = checks.map((check, index) => ({
    service: ['database', 'worldid', 'storage', 'kv'][index],
    status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
    latency: check.status === 'fulfilled' ? check.value.latency : null,
    error: check.status === 'rejected' ? check.reason.message : null
  }));

  const overall = results.every(r => r.status === 'healthy') ? 'healthy' : 'degraded';

  return Response.json({
    status: overall,
    timestamp: new Date().toISOString(),
    services: results,
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown'
  });
}
```

### Metrics Endpoint
```javascript
// /api/monitoring/metrics
export async function GET() {
  const [userMetrics, taskMetrics, paymentMetrics] = await Promise.all([
    getUserMetrics(),
    getTaskMetrics(),
    getPaymentMetrics()
  ]);

  return Response.json({
    timestamp: new Date().toISOString(),
    users: userMetrics,
    tasks: taskMetrics,
    payments: paymentMetrics
  });
}
```

---

## 🛠️ Setup Checklist

### Immediate Setup (Day 1)
- [ ] Enable Vercel Analytics
- [ ] Set up basic error tracking
- [ ] Create health check endpoints
- [ ] Configure basic alerts

### Week 1 Setup
- [ ] Implement Sentry error tracking
- [ ] Set up Slack notifications
- [ ] Create business metrics tracking
- [ ] Configure performance monitoring

### Advanced Setup (Month 1)
- [ ] Implement custom dashboards
- [ ] Set up session replay (if needed)
- [ ] Create automated reporting
- [ ] Optimize alert thresholds

---

## 💰 Cost Considerations

### Free Tier Limits
- **Vercel Analytics**: Included in all plans
- **Sentry**: 5K errors/month free
- **LogRocket**: 1K sessions/month free

### Recommended Paid Plans
- **Sentry**: Team plan ($26/month) for production
- **LogRocket**: Professional plan ($99/month) if needed
- **Vercel Pro**: Required for advanced analytics

---

## 🔒 Privacy Considerations

### Data Collection Guidelines
- ❌ Never log World ID nullifier hashes
- ❌ Never log user wallet addresses
- ❌ Never log payment details
- ✅ Log sanitized error messages
- ✅ Log performance metrics
- ✅ Log user journey events (anonymized)

### GDPR Compliance
```javascript
// Sanitize data before logging
export function sanitizeLogData(data: any) {
  const sensitiveFields = ['nullifier_hash', 'wallet_address', 'private_key', 'email'];
  const sanitized = { ...data };

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      delete sanitized[field];
    }
  });

  return sanitized;
}
```

---

*This monitoring setup provides comprehensive visibility into your WorldHuman Studio application while maintaining user privacy and security.*

*Last updated: September 26, 2025*