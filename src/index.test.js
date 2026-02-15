/**
 * Unit tests for the Express app and Payment Service.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

const { app } = require('./index.js');
const {
  validatePaymentDetails,
  PaymentStatus,
  DEFAULT_MAX_RETRIES,
} = require('./paymentService.js');

describe('Express app', () => {
  let server;
  let baseUrl;

  before(() => {
    return new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });
  });

  after(() => {
    return new Promise((resolve) => server.close(resolve));
  });

  it('should export app', () => {
    assert.strictEqual(typeof app, 'function');
  });

  it('GET / returns JSON with expected shape', async () => {
    const res = await fetch(`${baseUrl}/`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'ok');
    assert.ok(data.timestamp);
    assert.ok(data.name);
  });

  it('GET /health returns 200 and healthy status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'healthy');
  });

  it('POST /payments returns 400 for missing amount', async () => {
    const res = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.status, 'error');
    assert.ok(data.errors.length > 0);
  });

  it('POST /payments returns 400 for negative amount', async () => {
    const res = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: -50 }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.status, 'error');
  });

  it('POST /payments returns 400 for amount exceeding limit', async () => {
    const res = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 50000 }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.ok(data.errors.some((e) => e.includes('exceeds maximum')));
  });

  it('POST /payments processes valid payment with retry metadata', async () => {
    // Use maxRetries=1 for faster test execution
    const res = await fetch(`${baseUrl}/payments?maxRetries=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100, currency: 'USD' }),
    });
    const data = await res.json();

    // Should return either success (200) or failed after retries (502)
    assert.ok([200, 502].includes(res.status));
    assert.ok(data.attempts);
    assert.ok(data.totalAttempts >= 1);
    assert.ok(data.startedAt);
    assert.ok(data.completedAt);
    assert.ok([PaymentStatus.SUCCESS, PaymentStatus.FAILED].includes(data.finalStatus));
  });

  it('GET /payments/status/:id returns transaction lookup response', async () => {
    const res = await fetch(`${baseUrl}/payments/status/txn_123`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.transactionId, 'txn_123');
  });
});

describe('Payment Service - validatePaymentDetails', () => {
  it('should return invalid for null payment details', () => {
    const result = validatePaymentDetails(null);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.length > 0);
  });

  it('should return invalid for missing amount', () => {
    const result = validatePaymentDetails({});
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes('Amount')));
  });

  it('should return invalid for zero amount', () => {
    const result = validatePaymentDetails({ amount: 0 });
    assert.strictEqual(result.isValid, false);
  });

  it('should return invalid for invalid currency code', () => {
    const result = validatePaymentDetails({ amount: 100, currency: 'INVALID' });
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes('Currency')));
  });

  it('should return valid for correct payment details', () => {
    const result = validatePaymentDetails({ amount: 100, currency: 'USD' });
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should return valid when currency is omitted', () => {
    const result = validatePaymentDetails({ amount: 50 });
    assert.strictEqual(result.isValid, true);
  });
});

describe('Payment Service - Constants', () => {
  it('should have default max retries defined', () => {
    assert.strictEqual(typeof DEFAULT_MAX_RETRIES, 'number');
    assert.ok(DEFAULT_MAX_RETRIES > 0);
  });

  it('should have payment status enum values', () => {
    assert.strictEqual(PaymentStatus.SUCCESS, 'success');
    assert.strictEqual(PaymentStatus.FAILED, 'failed');
    assert.strictEqual(PaymentStatus.PENDING, 'pending');
    assert.strictEqual(PaymentStatus.RETRYING, 'retrying');
  });
});
