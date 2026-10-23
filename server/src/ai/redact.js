/**
 * Redaction utility enforcing Non-Negotiable Principle #4: FAIR BY CONSTRUCTION.
 * Redacts personal identifying information (PII) before any text is sent to LLM providers.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g;
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|linkedin\.com\/[^\s]+|github\.com\/[^\s]+)/gi;

export const redactPii = (text) => {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
    .replace(PHONE_REGEX, '[REDACTED_PHONE]')
    .replace(URL_REGEX, '[REDACTED_URL]');
};

export const redactPII = redactPii;
export default redactPii;

