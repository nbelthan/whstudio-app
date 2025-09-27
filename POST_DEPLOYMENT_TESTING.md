# Post-Deployment Testing Checklist

## 🧪 Comprehensive Testing Guide for WorldHuman Studio

### Testing Overview
This checklist ensures all critical functionality works correctly in the production environment after deployment.

---

## ✅ Infrastructure & Connectivity Tests

### 1. Basic Connectivity
- [ ] **Application loads successfully**
  ```bash
  curl -I https://your-app.vercel.app
  # Should return 200 OK
  ```

- [ ] **Health check endpoint responds**
  ```bash
  curl https://your-app.vercel.app/api/auth/session
  # Should return JSON response without errors
  ```

- [ ] **API endpoints are accessible**
  ```bash
  curl https://your-app.vercel.app/api/tasks
  # Should return tasks list or authentication required
  ```

### 2. Database Connectivity
- [ ] **Database connection successful**
  ```bash
  curl https://your-app.vercel.app/api/monitoring/health
  # Check database status in response
  ```

- [ ] **Database schema exists**
  - Verify all 8 tables are created
  - Check indexes and constraints
  - Validate triggers and functions

### 3. Storage Services
- [ ] **Vercel KV (Redis) connectivity**
  ```javascript
  // Test via API endpoint
  GET /api/test/kv
  ```

- [ ] **Vercel Blob Storage connectivity**
  ```javascript
  // Test file upload capability
  POST /api/test/blob
  ```

---

## 🌍 World ID Integration Tests

### 1. World ID Configuration
- [ ] **World App ID configured correctly**
  ```bash
  # Check environment variables
  echo $WORLD_APP_ID
  echo $NEXT_PUBLIC_APP_ID
  ```

- [ ] **World ID API connectivity**
  ```bash
  curl -X POST https://developer.worldcoin.org/api/v1/verify/$WORLD_APP_ID \
    -H "Content-Type: application/json" \
    -d '{"test": true}'
  # Should return valid response (not 404)
  ```

### 2. Verification Flow Testing
- [ ] **Development mode verification works**
  ```json
  POST /api/verify
  {
    "action_id": "verify_human",
    "nullifier_hash": "0x1234567890abcdef",
    "merkle_root": "0x1234567890abcdef",
    "proof": "test_proof",
    "verification_level": "orb"
  }
  ```

- [ ] **Production World ID verification**
  - Test with actual World App
  - Verify nullifier hash uniqueness
  - Test both orb and device verification levels

### 3. User Session Management
- [ ] **Session creation after verification**
  - User record created in database
  - Session stored in KV
  - JWT token generated and returned

- [ ] **Session persistence**
  - Subsequent API calls use session
  - Session expires correctly
  - Logout clears session

---

## 📱 Core Application Features

### 1. User Authentication Flow
- [ ] **New user registration**
  1. World ID verification successful
  2. User profile created
  3. Session established
  4. Dashboard accessible

- [ ] **Existing user login**
  1. World ID verification with existing nullifier
  2. User profile updated
  3. New session created
  4. Previous data preserved

### 2. Task Management
- [ ] **Task listing**
  ```bash
  curl -H "Authorization: Bearer $JWT_TOKEN" \
    https://your-app.vercel.app/api/tasks
  ```

- [ ] **Task assignment**
  ```bash
  curl -X POST -H "Authorization: Bearer $JWT_TOKEN" \
    https://your-app.vercel.app/api/tasks/assign
  ```

- [ ] **Task submission**
  ```bash
  curl -X POST -H "Authorization: Bearer $JWT_TOKEN" \
    https://your-app.vercel.app/api/tasks/123/submit \
    -d '{"response": "test response"}'
  ```

### 3. Audio Recording & Storage
- [ ] **Audio upload functionality**
  - Test file size limits (10MB max)
  - Test supported formats (.mp3, .wav, .m4a, .ogg)
  - Verify virus scanning (if implemented)

- [ ] **Audio playback**
  - Verify signed URLs for private access
  - Test playback in different browsers
  - Check mobile compatibility

### 4. Payment Integration
- [ ] **Payment initiation**
  ```bash
  curl -X POST -H "Authorization: Bearer $JWT_TOKEN" \
    https://your-app.vercel.app/api/pay/initiate \
    -d '{
      "amount": 1.0,
      "currency": "USDC",
      "payment_type": "task_reward"
    }'
  ```

- [ ] **MiniKit payment flow**
  - Test payment request generation
  - Verify payment confirmation webhook
  - Check payment status updates

---

## 🔒 Security & Performance Tests

### 1. Security Headers
- [ ] **Security headers present**
  ```bash
  curl -I https://your-app.vercel.app
  # Check for:
  # - X-Content-Type-Options: nosniff
  # - X-Frame-Options: DENY
  # - X-XSS-Protection: 1; mode=block
  # - Strict-Transport-Security
  ```

- [ ] **CORS configuration**
  ```bash
  curl -X OPTIONS https://your-app.vercel.app/api/verify \
    -H "Origin: https://minikit.worldcoin.org"
  # Should allow World App origins
  ```

### 2. Authentication & Authorization
- [ ] **Protected endpoints require authentication**
  ```bash
  curl https://your-app.vercel.app/api/tasks/123/submit
  # Should return 401 Unauthorized
  ```

- [ ] **JWT token validation**
  - Test expired tokens
  - Test invalid tokens
  - Test token refresh

### 3. Rate Limiting
- [ ] **API rate limiting active**
  ```bash
  # Make multiple rapid requests
  for i in {1..10}; do
    curl https://your-app.vercel.app/api/verify
  done
  # Should eventually return 429 Too Many Requests
  ```

- [ ] **World ID verification rate limiting**
  - Test multiple verification attempts
  - Verify 15-minute cooldown period

### 4. Performance Testing
- [ ] **Page load performance**
  - LCP (Largest Contentful Paint) < 2.5s
  - FID (First Input Delay) < 100ms
  - CLS (Cumulative Layout Shift) < 0.1

- [ ] **API response times**
  ```bash
  # Test API performance
  curl -w "@curl-format.txt" -o /dev/null -s https://your-app.vercel.app/api/tasks
  # Response time should be < 500ms
  ```

---

## 📊 Data Integrity Tests

### 1. Database Operations
- [ ] **User data consistency**
  - Verify unique nullifier_hash constraint
  - Check foreign key relationships
  - Test transaction rollbacks

- [ ] **Task assignment logic**
  - Verify users get appropriate tasks
  - Check task availability updates
  - Test consensus mechanisms

### 2. Payment Data
- [ ] **Payment record accuracy**
  - Verify payment amounts
  - Check currency conversions
  - Validate transaction hashes

- [ ] **Earnings calculations**
  - Test reward distributions
  - Verify payment status updates
  - Check escrow handling

---

## 🔍 Error Handling Tests

### 1. Graceful Degradation
- [ ] **Database connection failures**
  - Test connection pool exhaustion
  - Verify error messages
  - Check retry mechanisms

- [ ] **External service failures**
  - Test World ID API downtime
  - Test payment service failures
  - Verify fallback behaviors

### 2. Input Validation
- [ ] **Malicious input handling**
  ```bash
  # Test SQL injection attempts
  curl -X POST https://your-app.vercel.app/api/verify \
    -d '{"action_id": "1; DROP TABLE users; --"}'
  # Should be properly sanitized
  ```

- [ ] **File upload security**
  - Test oversized files
  - Test malicious file types
  - Test filename injection attempts

---

## 📱 Mobile & World App Testing

### 1. World App Integration
- [ ] **MiniKit integration functional**
  - Test within World App environment
  - Verify deep linking works
  - Check responsive design

- [ ] **Mobile performance**
  - Test on iOS and Android
  - Verify touch interactions
  - Check loading performance on mobile

### 2. Cross-Browser Compatibility
- [ ] **Desktop browsers**
  - Chrome (latest)
  - Firefox (latest)
  - Safari (latest)
  - Edge (latest)

- [ ] **Mobile browsers**
  - Mobile Chrome
  - Mobile Safari
  - World App browser

---

## 📈 Monitoring & Analytics Tests

### 1. Error Tracking
- [ ] **Sentry integration working**
  - Generate test error
  - Verify error appears in Sentry
  - Check source maps functionality

- [ ] **Performance monitoring**
  - Verify Vercel Analytics data
  - Check custom event tracking
  - Test performance thresholds

### 2. Business Metrics
- [ ] **User analytics tracking**
  - Verify user registration events
  - Check task completion tracking
  - Test payment success events

---

## 🎯 Load Testing (Optional)

### Simple Load Test
```bash
# Install Apache Bench
# Test API endpoint performance
ab -n 1000 -c 10 https://your-app.vercel.app/api/health

# Test World ID verification under load
ab -n 100 -c 5 -p verify-payload.json -T application/json \
   https://your-app.vercel.app/api/verify
```

---

## 📋 Sign-off Checklist

### Technical Sign-off
- [ ] All infrastructure tests passed
- [ ] Security tests completed
- [ ] Performance benchmarks met
- [ ] Error handling verified

### Business Sign-off
- [ ] World ID integration functional
- [ ] Task flows complete successfully
- [ ] Payment processing works
- [ ] User experience tested

### Production Readiness
- [ ] Monitoring alerts configured
- [ ] Backup procedures tested
- [ ] Rollback plan documented
- [ ] Support documentation updated

---

## 🚨 Emergency Procedures

### If Critical Issues Found:
1. **Document the issue immediately**
2. **Check if it's a blocking issue**
3. **Implement immediate fix or rollback**
4. **Notify stakeholders**
5. **Update monitoring thresholds**

### Rollback Procedure:
```bash
# Quick rollback to previous deployment
vercel --prod --force

# Or rollback to specific deployment
vercel promote <deployment-url> --scope=<team>
```

---

## 📊 Testing Report Template

```markdown
## WorldHuman Studio - Production Testing Report

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Environment**: Production
**Version**: [Git SHA]

### Test Results Summary
- Infrastructure Tests: ✅/❌
- World ID Integration: ✅/❌
- Core Features: ✅/❌
- Security Tests: ✅/❌
- Performance Tests: ✅/❌

### Issues Identified
| Priority | Issue | Status |
|----------|-------|--------|
| High     | [Description] | Open/Fixed |

### Performance Metrics
- Average API Response Time: XXXms
- Page Load Time (LCP): XXXms
- Error Rate: X.X%

### Recommendations
1. [Recommendation 1]
2. [Recommendation 2]

### Sign-off
- Technical Lead: ✅/❌
- Product Owner: ✅/❌
- Security Review: ✅/❌
```

---

*Complete this checklist thoroughly before declaring the production deployment successful.*

*Last updated: September 26, 2025*