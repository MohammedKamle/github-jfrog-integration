/**
 * Payment Service with Retry Logic
 * Handles payment processing with configurable retry attempts for transient failures.
 */

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;

/**
 * Payment status codes
 */
const PaymentStatus = {
  SUCCESS: 'success',
  PENDING: 'pending',
  FAILED: 'failed',
  RETRYING: 'retrying',
};

/**
 * Simulates a payment gateway call
 * In production, this would call an actual payment provider API
 * @param {Object} paymentDetails - Payment information
 * @returns {Promise<Object>} Payment result
 */
async function processPaymentAttempt(paymentDetails) {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Simulate occasional transient failures (30% failure rate for demo)
  const shouldFail = Math.random() < 0.3;

  if (shouldFail) {
    const error = new Error('Payment gateway temporarily unavailable');
    error.code = 'GATEWAY_TIMEOUT';
    error.retryable = true;
    throw error;
  }

  return {
    transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    amount: paymentDetails.amount,
    currency: paymentDetails.currency || 'USD',
    status: PaymentStatus.SUCCESS,
    processedAt: new Date().toISOString(),
  };
}

/**
 * Sleep helper for retry delays with exponential backoff
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise<void>}
 */
function sleep(attempt, baseDelay) {
  const delay = baseDelay * Math.pow(2, attempt);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Process a payment with automatic retry on transient failures
 * @param {Object} paymentDetails - Payment details
 * @param {number} paymentDetails.amount - Payment amount
 * @param {string} [paymentDetails.currency='USD'] - Currency code
 * @param {string} [paymentDetails.customerId] - Customer identifier
 * @param {Object} [options] - Retry options
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number} [options.retryDelayMs=1000] - Base delay between retries
 * @returns {Promise<Object>} Payment result with retry metadata
 */
async function processPaymentWithRetry(paymentDetails, options = {}) {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  const result = {
    paymentDetails,
    attempts: [],
    totalAttempts: 0,
    finalStatus: PaymentStatus.PENDING,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    result.totalAttempts = attempt + 1;

    const attemptRecord = {
      attemptNumber: attempt + 1,
      timestamp: new Date().toISOString(),
      status: PaymentStatus.PENDING,
      error: null,
      transactionId: null,
    };

    try {
      const paymentResult = await processPaymentAttempt(paymentDetails);

      attemptRecord.status = PaymentStatus.SUCCESS;
      attemptRecord.transactionId = paymentResult.transactionId;
      result.attempts.push(attemptRecord);
      result.finalStatus = PaymentStatus.SUCCESS;
      result.completedAt = new Date().toISOString();
      result.transaction = paymentResult;

      return result;
    } catch (error) {
      attemptRecord.status = PaymentStatus.FAILED;
      attemptRecord.error = {
        message: error.message,
        code: error.code,
        retryable: error.retryable || false,
      };
      result.attempts.push(attemptRecord);

      // Don't retry if error is not retryable or we've exhausted retries
      if (!error.retryable || attempt === maxRetries) {
        result.finalStatus = PaymentStatus.FAILED;
        result.completedAt = new Date().toISOString();
        result.error = attemptRecord.error;
        return result;
      }

      // Wait before retrying with exponential backoff
      await sleep(attempt, retryDelayMs);
    }
  }

  return result;
}

/**
 * Validate payment details
 * @param {Object} paymentDetails - Payment details to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
function validatePaymentDetails(paymentDetails) {
  const errors = [];

  if (!paymentDetails) {
    errors.push('Payment details are required');
    return { isValid: false, errors };
  }

  if (typeof paymentDetails.amount !== 'number' || paymentDetails.amount <= 0) {
    errors.push('Amount must be a positive number');
  }

  if (paymentDetails.amount > 10000) {
    errors.push('Amount exceeds maximum allowed (10000)');
  }

  if (paymentDetails.currency && !/^[A-Z]{3}$/.test(paymentDetails.currency)) {
    errors.push('Currency must be a valid 3-letter ISO code');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  processPaymentWithRetry,
  validatePaymentDetails,
  PaymentStatus,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY_MS,
};
