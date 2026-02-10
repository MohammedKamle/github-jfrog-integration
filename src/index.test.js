/**
 * Unit tests for the Express app.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

const { app } = require('./index.js');

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
});
