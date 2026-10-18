/**
 * Sanitizes log messages and objects to prevent credential and secret leakage.
 * Redacts:
 * - Database connection strings (mongodb://, postgres://, etc.)
 * - URIs with embedded username/password
 * - Bearer tokens and JSON Web Tokens (JWTs)
 * - Passwords, passcodes, secrets, and auth tokens in JSON or query parameters
 */
function sanitizeLog(input) {
  if (input === null || input === undefined) {
    return '';
  }

  let text;
  if (typeof input === 'string') {
    text = input;
  } else if (input instanceof Error) {
    text = input.stack || input.message || String(input);
  } else if (typeof input === 'object') {
    try {
      text = JSON.stringify(input);
    } catch {
      text = String(input);
    }
  } else {
    text = String(input);
  }

  // 1. Redact URIs with credentials (e.g. mongodb://user:pass@host, https://user:pass@host)
  text = text.replace(/[a-zA-Z0-9+.-]+:\/\/[^\s:@/]+:[^\s:@/]+@[^\s"']+/g, '[REDACTED_URI]');

  // 2. Redact MongoDB connection strings even if without user/pass (e.g. mongodb://host:port/db)
  text = text.replace(/mongodb(?:\+srv)?:\/\/[^\s"']+/gi, '[REDACTED_DB_URI]');

  // 3. Redact JWT tokens (header.payload.signature)
  text = text.replace(/eyJ[a-zA-Z0-9_-]{8,}\.eyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]+/g, '[REDACTED_JWT]');

  // 4. Redact Bearer tokens
  text = text.replace(/Bearer\s+[a-zA-Z0-9_.-]+/gi, 'Bearer [REDACTED_TOKEN]');

  // 5. Redact passwords / passcodes in JSON structures (e.g. "password":"secret123")
  text = text.replace(/(["']?(?:password|passcode|token|secret|jwt)["']?\s*[:=]\s*["']?)[^"',\s}]+(["']?)/gi, '$1[REDACTED]$2');

  // 6. Redact password/token query parameters (e.g. ?token=secret123)
  text = text.replace(/([?&](?:password|passcode|token|secret)=)[^&\s]+/gi, '$1[REDACTED]');

  return text;
}

module.exports = {
  sanitizeLog
};
