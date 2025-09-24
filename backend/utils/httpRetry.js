const axios = require('axios');

/**
 * Sleep helper
 * @param {number} ms
 */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parse Retry-After header into milliseconds when available
 * Supports seconds or HTTP-date formats
 * @param {import('axios').AxiosError} error
 * @returns {number|null}
 */
function parseRetryAfterMs(error) {
  const header = error?.response?.headers?.['retry-after'] || error?.response?.headers?.['Retry-After'];
  if (!header) return null;

  // If header is a number, it's seconds
  const seconds = Number(header);
  if (!Number.isNaN(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  // Otherwise try parsing as date
  const dateMs = Date.parse(header);
  if (!Number.isNaN(dateMs)) {
    const delta = dateMs - Date.now();
    return Math.max(0, delta);
  }

  return null;
}

/**
 * Generate small jitter to avoid thundering herd
 * @returns {number} milliseconds of jitter
 */
function jitterMs() {
  return 100 + Math.floor(Math.random() * 300); // 100-400ms
}

/**
 * Generic request retry wrapper for 429 responses with exponential backoff
 * Honors Retry-After header when present
 *
 * @param {() => Promise<any>} makeRequest - function performing the HTTP request
 * @param {{retries?: number, baseDelayMs?: number}} [options]
 */
async function axiosRequestWithRetry(makeRequest, options = {}) {
  const retries = options.retries ?? 3;
  let backoff = options.baseDelayMs ?? 1000;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await makeRequest();
    } catch (error) {
      const status = error?.response?.status;
      const isLastAttempt = attempt >= retries;
      if (status === 429 && !isLastAttempt) {
        const retryAfter = parseRetryAfterMs(error);
        const delay = (retryAfter !== null ? retryAfter : backoff) + jitterMs();
        await wait(delay);
        backoff *= 2;
        continue;
      }
      throw error;
    }
  }
}

/**
 * Convenience wrappers
 */
function axiosGetWithRetry(url, config, options) {
  return axiosRequestWithRetry(() => axios.get(url, config), options);
}

function axiosPostWithRetry(url, data, config, options) {
  return axiosRequestWithRetry(() => axios.post(url, data, config), options);
}

// Backwards-compat name for modules expecting axiosWithRetry(apiCall)
function axiosWithRetry(apiCall, retries = 3, backoff = 1000) {
  return axiosRequestWithRetry(apiCall, { retries, baseDelayMs: backoff });
}

module.exports = {
  axiosRequestWithRetry,
  axiosGetWithRetry,
  axiosPostWithRetry,
  axiosWithRetry,
};


