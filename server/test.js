import http from 'http';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from './server.js';
import User from './models/User.js';
import Poll from './models/Poll.js';
import Vote from './models/Vote.js';

let mongod = null;
let server = null;
let baseUrl = '';

async function setup() {
  console.log('\n==================================================');
  console.log('  STARTING AUTONOMOUS MULTI-TENANT TEST SUITE');
  console.log('==================================================\n');

  try {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'test_multi_tenant_db' },
      binary: { downloadDir: process.env.TMPDIR || '/tmp' },
    });
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log('✔ In-memory MongoDB server started.');
  } catch (err) {
    console.log(`[MongoMemoryServer Warning] ${err.message}. Trying local...`);
    try {
      await mongoose.connect('mongodb://127.0.0.1:27017/student_voting_test', { serverSelectionTimeoutMS: 3000 });
      console.log('✔ Connected to local MongoDB.');
    } catch {
      console.warn('⚠️ No active MongoDB connection available.');
    }
  }

  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({});
    await Poll.deleteMany({});
    await Vote.deleteMany({});
  }

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  console.log(`✔ Express server listening on test port ${port}.\n`);
}

async function teardown() {
  if (mongoose.connection.readyState !== 0) {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({});
      await Poll.deleteMany({});
      await Vote.deleteMany({});
    }
    await mongoose.disconnect();
  }
  if (mongod) await mongod.stop();
  if (server) server.close();
  console.log('✔ Test suite teardown complete.\n');
}

async function makeRequest(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const response = await fetch(url, {
    ...options,
    headers: reqHeaders,
  });
  const data = await response.json();
  return { status: response.status, data };
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    await setup();

    // TEST 1: Health Check
    console.log('--> Test 1: GET /api/health');
    const health = await makeRequest('/api/health');
    assert(health.status === 200 && health.data.status === 'online', 'Health endpoint returns 200 OK');

    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️ Skipping DB assertions — no active MongoDB connection.');
      return;
    }

    // TEST 2: Credentials Signup & Login
    console.log('\n--> Test 2: Auth (Signup & Login)');
    const signupRes = await makeRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Admin User',
        email: 'admin@university.edu',
        password: 'password123',
      }),
    });
    assert(signupRes.status === 201, 'Signup returns HTTP 201 Created');
    assert(!!signupRes.data.token, 'Signup returns JWT token');

    const adminToken = signupRes.data.token;

    const loginRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@university.edu',
        password: 'password123',
      }),
    });
    assert(loginRes.status === 200, 'Login returns HTTP 200 OK');
    assert(loginRes.data.user.email === 'admin@university.edu', 'Login returns user profile');

    // TEST 3: Google OAuth Simulation
    console.log('\n--> Test 3: Auth (Google OAuth Simulation)');
    const googleRes = await makeRequest('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Google User',
        email: 'googleuser@gmail.com',
        googleId: 'google_id_999',
      }),
    });
    assert(googleRes.status === 200, 'Google OAuth endpoint returns 200 OK');
    assert(googleRes.data.user.authProvider === 'google', 'User saved with authProvider: "google"');

    // TEST 4: Poll Creation
    console.log('\n--> Test 4: Create Poll (Admin Protected)');
    const pollRes = await makeRequest('/api/polls', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Student Council President Election',
        description: 'Vote for your 2026 Student Council President',
        options: ['Candidate Alice', 'Candidate Bob', 'Candidate Charlie'],
        trackingMethod: 'both',
        isResultPublic: false,
        duration: { days: 1, hours: 0, minutes: 0, seconds: 0 },
      }),
    });
    assert(pollRes.status === 201, 'Poll creation returns HTTP 201 Created');
    const createdPollId = pollRes.data.poll.id;
    assert(pollRes.data.poll.options.length === 3, 'Poll has 3 candidate options');

    // TEST 5: Vote on Poll (Valid Vote)
    console.log('\n--> Test 5: POST /api/vote (Valid Vote)');
    const vote1 = await makeRequest('/api/vote', {
      method: 'POST',
      body: JSON.stringify({
        pollId: createdPollId,
        studentId: 'STU2001',
        email: 'voter1@university.edu',
        selectedOption: 'Candidate Alice',
      }),
    });
    assert(vote1.status === 201, 'Vote submission returns HTTP 201 Created');
    assert(vote1.data.data.selectedOption === 'Candidate Alice', 'Vote registered for Candidate Alice');

    // TEST 6: Duplicate Student ID Check
    console.log('\n--> Test 6: POST /api/vote (Duplicate Student ID Check)');
    const dupVote = await makeRequest('/api/vote', {
      method: 'POST',
      body: JSON.stringify({
        pollId: createdPollId,
        studentId: 'stu2001', // case-insensitive check
        email: 'other_email@university.edu',
        selectedOption: 'Candidate Bob',
      }),
    });
    assert(dupVote.status === 400, 'Rejects duplicate Student ID with HTTP 400');

    // TEST 7: Private Results Masking vs Toggle
    console.log('\n--> Test 7: Poll Results Privacy Masking & Toggle');
    const privateStats = await makeRequest(`/api/polls/${createdPollId}/stats`);
    assert(privateStats.data.isResultPublic === false, 'Stats endpoint reports isResultPublic: false');
    assert(privateStats.data.stats.options.length === 0, 'Hides options breakdown when private');

    // Toggle results visibility to public
    const toggleRes = await makeRequest(`/api/polls/${createdPollId}/toggle-results`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(toggleRes.status === 200, 'Toggle visibility returns HTTP 200 OK');
    assert(toggleRes.data.isResultPublic === true, 'Visibility toggled to true');

    const publicStats = await makeRequest(`/api/polls/${createdPollId}/stats`);
    assert(publicStats.data.stats.options.length === 3, 'Displays full candidate options breakdown when public');
    assert(publicStats.data.stats.totalVotes === 1, 'Reflects total 1 vote');

    // TEST 8: Expired Poll Submission Rejection
    console.log('\n--> Test 8: Expired Poll Voting Rejection');
    const expiredPollRes = await makeRequest('/api/polls', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Expired Poll',
        options: ['Option A', 'Option B'],
        trackingMethod: 'studentId',
        duration: { days: 0, hours: 0, minutes: 0, seconds: -10 }, // expired 10 seconds ago
      }),
    });
    const expiredPollId = expiredPollRes.data.poll.id;

    const expiredVote = await makeRequest('/api/vote', {
      method: 'POST',
      body: JSON.stringify({
        pollId: expiredPollId,
        studentId: 'STU9999',
        selectedOption: 'Option A',
      }),
    });
    assert(expiredVote.status === 400, 'Rejects vote on expired poll with HTTP 400');
    assert(
      expiredVote.data.error === 'This poll has closed. Voting is no longer accepted.',
      `Returns exact closed message: "${expiredVote.data.error}"`
    );

    console.log('\n==================================================');
    console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================\n');

    if (failed > 0) process.exitCode = 1;
  } catch (err) {
    console.error('Fatal error during test execution:', err);
    process.exitCode = 1;
  } finally {
    await teardown();
  }
}

runTests();
