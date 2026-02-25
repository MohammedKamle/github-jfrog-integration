#!/usr/bin/env node
/**
 * Minimal Express server for GitHub ⇄ JFrog integration demo.
 * Serves a health check and a simple info endpoint.some comments
 */

const express = require('express');
const _ = require('lodash');
const {
  processPaymentWithRetry,
  validatePaymentDetails,
  PaymentStatus,
} = require('./paymentService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

app.get('/', (req, res) => {
  const payload = _.merge({}, req.query);
  res.json({
    ...payload,
    name: 'github-jfrog-demo',
    version: process.env.npm_package_version || '1.0.0',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

/**
 * POST /payments
 * Process a payment with automatic retry on transient failures
 *
 * Request body:
 *   - amount: number (required) - Payment amount
 *   - currency: string (optional) - 3-letter currency code, defaults to USD
 *   - customerId: string (optional) - Customer identifier
 *
 * Query params:
 *   - maxRetries: number (optional) - Override default max retries
 */
app.post('/payments', async (req, res) => {
  try {
    const paymentDetails = req.body;
    const options = {};

    // Allow overriding max retries via query param
    if (req.query.maxRetries) {
      options.maxRetries = parseInt(req.query.maxRetries, 10);
    }

    // Validate payment details
    const validation = validatePaymentDetails(paymentDetails);
    if (!validation.isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid payment details',
        errors: validation.errors,
      });
    }

    // Process payment with retry logic
    const result = await processPaymentWithRetry(paymentDetails, options);

    const statusCode = result.finalStatus === PaymentStatus.SUCCESS ? 200 : 502;
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * GET /payments/status/:transactionId
 * Get payment status (stub for demo purposes)
 */
app.get('/payments/status/:transactionId', (req, res) => {
  const { transactionId } = req.params;

  // In a real app, this would look up the transaction in a database
  res.json({
    transactionId,
    status: 'unknown',
    message: 'Transaction lookup not implemented in demo',
  });
});

// Only start server when run directly (not when required for tests)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
  module.exports = { app, server };
} else {
  module.exports = { app };
}
