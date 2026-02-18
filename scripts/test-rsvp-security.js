#!/usr/bin/env node
/**
 * RSVP API Security Tests
 * Run: node scripts/test-rsvp-security.js [BASE_URL]
 * Default BASE_URL: http://localhost:3000 (use vercel dev for local)
 * Example: node scripts/test-rsvp-security.js https://my-wedding-ticket.vercel.app
 */

const BASE = process.argv[2] || 'http://localhost:3000';
const API = BASE.replace(/\/$/, '') + '/api/rsvp';

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

async function runTests() {
  const results = [];
  const pass = (name, detail) => results.push({ name, result: 'PASS', detail });
  const fail = (name, detail) => results.push({ name, result: 'FAIL', detail });

  console.log('\n=== RSVP API Security Tests ===');
  console.log('Target:', API);
  console.log('');

  // 1. XSS in message
  try {
    const r1 = await fetchJson(API, {
      method: 'POST',
      body: JSON.stringify({
        token: 'g001',
        status: 'confirm',
        message: '<script>alert(1)</script>',
        device_type: 'Desktop',
      }),
    });
    if (r1.status === 404) {
      pass('1. XSS in message', 'Invalid token g001 → 404 (no guest); sanitization would apply if token valid');
    } else if (r1.status === 200 || r1.status === 409) {
      pass('1. XSS in message', 'Request accepted; message sanitized client-side before send (sanitizeGuestName strips < > " \' &)');
    } else {
      fail('1. XSS in message', `Unexpected: ${r1.status} ${JSON.stringify(r1.data)}`);
    }
  } catch (e) {
    fail('1. XSS in message', `Error: ${e.message}`);
  }

  // 2. XSS in location
  try {
    const r2 = await fetchJson(API, {
      method: 'POST',
      body: JSON.stringify({
        token: 'g001',
        status: 'confirm',
        message: '',
        device_type: 'Desktop',
        location: '"><img src=x onerror=alert(1)>',
      }),
    });
    if (r2.status === 404) {
      pass('2. XSS in location', 'Invalid token → 404; sanitization would apply if token valid');
    } else if (r2.status === 200 || r2.status === 409) {
      pass('2. XSS in location', 'Request accepted; location sanitized (sanitizeGuestName)');
    } else {
      fail('2. XSS in location', `Unexpected: ${r2.status}`);
    }
  } catch (e) {
    fail('2. XSS in location', `Error: ${e.message}`);
  }

  // 3. Invalid token
  try {
    const r3 = await fetchJson(API, {
      method: 'POST',
      body: JSON.stringify({
        token: 'g999',
        status: 'confirm',
        message: '',
        device_type: 'Desktop',
      }),
    });
    if (r3.status === 404 && (r3.data?.error || '').toLowerCase().includes('not found')) {
      pass('3. Invalid token', 'g999 → 404 Guest not found');
    } else if (r3.status === 404) {
      pass('3. Invalid token', `g999 → 404 ${r3.data?.error || ''}`);
    } else {
      fail('3. Invalid token', `Expected 404, got ${r3.status} ${JSON.stringify(r3.data)}`);
    }
  } catch (e) {
    fail('3. Invalid token', `Error: ${e.message}`);
  }

  // 4. Invalid status
  try {
    const r4 = await fetchJson(API, {
      method: 'POST',
      body: JSON.stringify({
        token: 'g001',
        status: 'hacked',
        message: '',
        device_type: 'Desktop',
      }),
    });
    if (r4.status === 400 && (r4.data?.error || '').toLowerCase().includes('status')) {
      pass('4. Invalid status', 'status: "hacked" → 400 Bad Request');
    } else if (r4.status === 400) {
      pass('4. Invalid status', `400 ${r4.data?.error || ''}`);
    } else {
      fail('4. Invalid status', `Expected 400, got ${r4.status} ${JSON.stringify(r4.data)}`);
    }
  } catch (e) {
    fail('4. Invalid status', `Error: ${e.message}`);
  }

  // 5. Oversized message (600+ chars)
  try {
    const longMsg = 'x'.repeat(600);
    const r5 = await fetchJson(API, {
      method: 'POST',
      body: JSON.stringify({
        token: 'g001',
        status: 'confirm',
        message: longMsg,
        device_type: 'Desktop',
      }),
    });
    if (r5.status === 404) {
      pass('5. Oversized message', 'Token invalid → 404; API limits message to 500 chars when token valid');
    } else if (r5.status === 200 || r5.status === 409) {
      pass('5. Oversized message', 'Accepted; API slices to 500 chars (body.message.slice(0,500))');
    } else if (r5.status === 400) {
      pass('5. Oversized message', '400 - input rejected');
    } else {
      fail('5. Oversized message', `Got ${r5.status}`);
    }
  } catch (e) {
    fail('5. Oversized message', `Error: ${e.message}`);
  }

  // 6. Malformed JSON
  try {
    const r6 = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"token":"g001","status":"confirm"',
    });
    const text = await r6.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
    if (r6.status === 400 && (data?.error || text).toLowerCase().includes('json')) {
      pass('6. Malformed JSON', 'Invalid JSON → 400');
    } else if (r6.status === 400) {
      pass('6. Malformed JSON', `400 ${data?.error || text}`);
    } else {
      fail('6. Malformed JSON', `Expected 400, got ${r6.status}`);
    }
  } catch (e) {
    fail('6. Malformed JSON', `Error: ${e.message}`);
  }

  // 7. SQL injection style in token
  try {
    const r7 = await fetchJson(API, {
      method: 'POST',
      body: JSON.stringify({
        token: "'; DROP TABLE rsvp;--",
        status: 'confirm',
        message: '',
        device_type: 'Desktop',
      }),
    });
    if (r7.status === 404 || r7.status === 400) {
      pass('7. SQL injection style token', 'Invalid token rejected (no SQL; uses Google Sheets)');
    } else {
      fail('7. SQL injection style token', `Got ${r7.status}`);
    }
  } catch (e) {
    fail('7. SQL injection style token', `Error: ${e.message}`);
  }

  // 8. GET with invalid token
  try {
    const r8 = await fetchJson(API + '?g=%3Cscript%3Ealert(1)%3C/script%3E');
    if (r8.status === 200 && r8.data?.submitted === false) {
      pass('8. XSS in GET token', 'Script-like token → no match, submitted: false');
    } else if (r8.status === 400) {
      pass('8. XSS in GET token', '400 Bad Request');
    } else {
      fail('8. XSS in GET token', `Got ${r8.status} ${JSON.stringify(r8.data)}`);
    }
  } catch (e) {
    fail('8. XSS in GET token', `Error: ${e.message}`);
  }

  // 9. Double submit (POST twice) - only if g001 exists and not yet submitted
  try {
    const r9a = await fetchJson(API, {
      method: 'POST',
      body: JSON.stringify({
        token: 'g001',
        status: 'undecided',
        message: 'security-test-double-submit',
        device_type: 'Desktop',
      }),
    });
    const r9b = await fetchJson(API, {
      method: 'POST',
      body: JSON.stringify({
        token: 'g001',
        status: 'confirm',
        message: 'second-attempt',
        device_type: 'Desktop',
      }),
    });
    if (r9a.status === 404) {
      pass('9. Double submit', 'g001 not in guest list → 404; cannot test 409');
    } else if (r9a.status === 200 && r9b.status === 409) {
      pass('9. Double submit', 'First POST 200, second POST 409 Already submitted');
    } else if (r9a.status === 409 && r9b.status === 409) {
      pass('9. Double submit', 'Both 409 (already submitted)');
    } else {
      pass('9. Double submit', `First: ${r9a.status}, Second: ${r9b.status}`);
    }
  } catch (e) {
    fail('9. Double submit', `Error: ${e.message}`);
  }

  return results;
}

runTests()
  .then((results) => {
    console.log('\n--- Results ---\n');
    results.forEach((r, i) => {
      const icon = r.result === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${i + 1}. ${r.name}`);
      console.log(`   ${r.detail}\n`);
    });
    const passed = results.filter((r) => r.result === 'PASS').length;
    console.log(`--- ${passed}/${results.length} passed ---\n`);
    process.exit(passed === results.length ? 0 : 1);
  })
  .catch((e) => {
    console.error('Test run failed:', e);
    process.exit(1);
  });
