#!/usr/bin/env node

import https from 'https';
import http from 'http';

const BASE_URL = 'https://whstudio-hk5i3byz8-nischals-projects.vercel.app';

// Test results tracker
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  warnings: [],
  results: []
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Tester/1.0',
        ...options.headers
      }
    };

    const req = (urlObj.protocol === 'https:' ? https : http).request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }

    req.end();
  });
}

// Test endpoint function
async function testEndpoint(name, method, path, expectedStatus = [200, 201], body = null, headers = {}) {
  console.log(`\n🧪 Testing ${method} ${path}`);

  try {
    const response = await makeRequest(`${BASE_URL}${path}`, {
      method,
      body,
      headers
    });

    const isExpectedStatus = Array.isArray(expectedStatus) ?
      expectedStatus.includes(response.status) :
      response.status === expectedStatus;

    const result = {
      endpoint: `${method} ${path}`,
      name,
      status: response.status,
      success: isExpectedStatus,
      data: response.data,
      rawData: response.rawData,
      parseError: response.parseError,
      headers: response.headers
    };

    if (isExpectedStatus) {
      console.log(`✅ ${name}: ${response.status}`);
      testResults.passed++;
    } else {
      console.log(`❌ ${name}: Expected ${expectedStatus}, got ${response.status}`);
      console.log(`   Response: ${response.rawData}`);
      testResults.failed++;
      testResults.errors.push({
        endpoint: `${method} ${path}`,
        expected: expectedStatus,
        actual: response.status,
        response: response.rawData
      });
    }

    testResults.results.push(result);
    return result;

  } catch (error) {
    console.log(`💥 ${name}: Network Error - ${error.message}`);
    testResults.failed++;
    testResults.errors.push({
      endpoint: `${method} ${path}`,
      error: error.message,
      type: 'Network Error'
    });

    const result = {
      endpoint: `${method} ${path}`,
      name,
      error: error.message,
      success: false
    };

    testResults.results.push(result);
    return result;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Comprehensive API Endpoint Testing');
  console.log(`Base URL: ${BASE_URL}\n`);

  // Authentication Endpoints
  console.log('\n📝 AUTHENTICATION ENDPOINTS');
  await testEndpoint('Get Session Status', 'GET', '/api/auth/session', [200, 401]);
  await testEndpoint('World ID Handshake', 'POST', '/api/auth/handshake', [200, 400, 401], {
    app_id: 'test_app_id',
    action: 'test_action'
  });
  await testEndpoint('Logout', 'POST', '/api/auth/logout', [200, 401]);
  await testEndpoint('Get User Profile', 'GET', '/api/auth/profile', [200, 401]);

  // World ID Verification
  console.log('\n🌍 WORLD ID VERIFICATION');
  await testEndpoint('World ID Verification', 'POST', '/api/verify', [200, 400], {
    proof: 'test_proof',
    merkle_root: 'test_root',
    nullifier_hash: 'test_nullifier',
    verification_level: 'orb'
  });
  await testEndpoint('Proof Verification', 'POST', '/api/verify-proof', [200, 400], {
    proof: 'test_proof_data'
  });

  // Task Management
  console.log('\n📋 TASK MANAGEMENT');
  await testEndpoint('List Tasks', 'GET', '/api/tasks', [200, 401]);
  await testEndpoint('Create Task', 'POST', '/api/tasks', [200, 201, 400, 401], {
    title: 'Test Task',
    description: 'Test Description',
    type: 'text_labeling',
    reward_amount: 100
  });
  await testEndpoint('Get Specific Task', 'GET', '/api/tasks/test-id', [200, 404, 401]);
  await testEndpoint('Get Next Available Task', 'GET', '/api/tasks/next', [200, 404, 401]);
  await testEndpoint('Assign Task to User', 'POST', '/api/tasks/assign', [200, 400, 401], {
    taskId: 'test-task-id',
    userId: 'test-user-id'
  });
  await testEndpoint('Get Task Categories', 'GET', '/api/tasks/categories', [200]);
  await testEndpoint('Get Task Consensus', 'GET', '/api/tasks/test-id/consensus', [200, 404, 401]);

  // Submissions
  console.log('\n📤 SUBMISSIONS');
  await testEndpoint('Submit Task Work', 'POST', '/api/tasks/test-id/submit', [200, 201, 400, 401], {
    submission_data: { answer: 'test answer' },
    completion_time: 120
  });
  await testEndpoint('List Submissions', 'GET', '/api/submissions', [200, 401]);
  await testEndpoint('Review Submission', 'POST', '/api/submissions/test-id/review', [200, 400, 401], {
    approved: true,
    feedback: 'Good work'
  });

  // Payments
  console.log('\n💰 PAYMENTS');
  await testEndpoint('List Payments', 'GET', '/api/payments', [200, 401]);
  await testEndpoint('Initiate Payment', 'POST', '/api/pay/initiate', [200, 400, 401], {
    amount: 100,
    currency: 'USDC',
    taskId: 'test-task-id'
  });
  await testEndpoint('Confirm Payment', 'POST', '/api/pay/confirm', [200, 400, 401], {
    paymentId: 'test-payment-id',
    transactionHash: 'test-tx-hash'
  });
  await testEndpoint('Confirm Specific Payment', 'POST', '/api/payments/test-id/confirm', [200, 400, 401], {
    transactionHash: 'test-tx-hash'
  });
  await testEndpoint('Payment Webhook', 'POST', '/api/payments/webhook', [200, 400], {
    event_type: 'payment.completed',
    payment_id: 'test-payment-id'
  });

  // Alternative payment endpoint (if exists)
  await testEndpoint('Initiate Payment (Alt)', 'POST', '/api/initiate-payment', [200, 400, 401], {
    amount: 100,
    currency: 'USDC'
  });

  // Admin
  console.log('\n👑 ADMIN ENDPOINTS');
  await testEndpoint('Admin View Submissions', 'GET', '/api/admin/submissions', [200, 401, 403]);

  // NextAuth endpoint (if configured)
  console.log('\n🔐 NEXTAUTH ENDPOINTS');
  await testEndpoint('NextAuth Providers', 'GET', '/api/auth/providers', [200, 404]);
  await testEndpoint('NextAuth Session', 'GET', '/api/auth/session', [200]);

  // Generate Summary Report
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY REPORT');
  console.log('='.repeat(80));

  console.log(`\n📈 Overall Results:`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`🎯 Total: ${testResults.passed + testResults.failed}`);
  console.log(`📊 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);

  if (testResults.errors.length > 0) {
    console.log(`\n❌ Detailed Errors:`);
    testResults.errors.forEach((error, index) => {
      console.log(`\n${index + 1}. ${error.endpoint}`);
      if (error.type === 'Network Error') {
        console.log(`   Error: ${error.error}`);
      } else {
        console.log(`   Expected: ${error.expected}, Got: ${error.actual}`);
        if (error.response && error.response.length < 500) {
          console.log(`   Response: ${error.response}`);
        }
      }
    });
  }

  // Endpoint Status Analysis
  console.log(`\n📋 Endpoint Status Analysis:`);
  const statusCounts = {};
  testResults.results.forEach(result => {
    if (result.status) {
      statusCounts[result.status] = (statusCounts[result.status] || 0) + 1;
    }
  });

  Object.entries(statusCounts).sort().forEach(([status, count]) => {
    console.log(`   ${status}: ${count} endpoints`);
  });

  // Environment Insights
  console.log(`\n🔍 Environment Insights:`);

  // Check for common deployment issues
  const has404s = testResults.results.some(r => r.status === 404);
  const has500s = testResults.results.some(r => r.status === 500);
  const hasNetworkErrors = testResults.results.some(r => r.error);

  if (has404s) {
    console.log(`   ⚠️  Some endpoints return 404 - may indicate missing route handlers`);
  }
  if (has500s) {
    console.log(`   🚨 Some endpoints return 500 - indicates server-side errors`);
  }
  if (hasNetworkErrors) {
    console.log(`   🌐 Network connectivity issues detected`);
  }

  // Database connectivity check
  const dbEndpoints = testResults.results.filter(r =>
    r.endpoint.includes('/tasks') ||
    r.endpoint.includes('/submissions') ||
    r.endpoint.includes('/payments')
  );

  const dbErrors = dbEndpoints.filter(r => r.status === 500);
  if (dbErrors.length > 0) {
    console.log(`   🗄️  Potential database connectivity issues (${dbErrors.length} DB endpoints with 500 errors)`);
  }

  console.log('\n🏁 API Testing Complete!');
}

// Run the tests
runTests().catch(console.error);