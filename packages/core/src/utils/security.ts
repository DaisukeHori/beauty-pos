// Security utilities for input validation and sanitization

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes script tags and dangerous attributes
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';

  return input
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '')
    // Remove javascript: URLs
    .replace(/javascript\s*:/gi, '')
    // Remove data: URLs (can be used for XSS)
    .replace(/data\s*:\s*text\/html/gi, '')
    // Remove expression() (IE CSS hack)
    .replace(/expression\s*\([^)]*\)/gi, '')
    // Remove vbscript: URLs
    .replace(/vbscript\s*:/gi, '')
    .trim();
}

/**
 * Sanitize plain text - escape HTML entities
 */
export function escapeHtml(input: string): string {
  if (!input) return '';

  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'/]/g, (char) => htmlEntities[char] || char);
}

/**
 * Validate and sanitize SQL-like patterns to prevent injection
 * Note: This is a secondary defense - always use parameterized queries
 */
export function sanitizeSqlLike(input: string): string {
  if (!input) return '';

  // Escape SQL special characters for LIKE patterns
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/'/g, "''");
}

/**
 * Validate UUID format
 */
export function isValidUUID(input: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(input);
}

/**
 * Validate that a string contains only safe characters for identifiers
 */
export function isValidIdentifier(input: string): boolean {
  const identifierRegex = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
  return identifierRegex.test(input);
}

/**
 * Sanitize file name to prevent path traversal
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return '';

  return fileName
    // Remove path separators
    .replace(/[/\\]/g, '')
    // Remove null bytes
    .replace(/\x00/g, '')
    // Remove other dangerous characters
    .replace(/[<>:"|?*]/g, '')
    // Prevent hidden files
    .replace(/^\.+/, '')
    // Limit length
    .substring(0, 255)
    .trim();
}

/**
 * Validate file extension against allowed list
 */
export function isAllowedFileExtension(
  fileName: string,
  allowedExtensions: string[]
): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext ? allowedExtensions.includes(ext) : false;
}

/**
 * Image file extensions commonly allowed
 */
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];

/**
 * Document file extensions commonly allowed
 */
export const ALLOWED_DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv'];

/**
 * Validate numeric input is within range
 */
export function isValidNumber(
  input: number,
  options: { min?: number; max?: number; allowDecimal?: boolean } = {}
): boolean {
  const { min = -Infinity, max = Infinity, allowDecimal = true } = options;

  if (typeof input !== 'number' || isNaN(input)) return false;
  if (!isFinite(input)) return false;
  if (!allowDecimal && !Number.isInteger(input)) return false;
  if (input < min || input > max) return false;

  return true;
}

/**
 * Validate string length
 */
export function isValidLength(
  input: string,
  options: { min?: number; max?: number } = {}
): boolean {
  const { min = 0, max = Infinity } = options;

  if (typeof input !== 'string') return false;
  const length = input.length;

  return length >= min && length <= max;
}

/**
 * Truncate string to maximum length safely
 */
export function truncate(input: string, maxLength: number): string {
  if (!input || input.length <= maxLength) return input;
  return input.substring(0, maxLength);
}

/**
 * Remove control characters from input
 */
export function removeControlChars(input: string): string {
  if (!input) return '';
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Normalize whitespace in input
 */
export function normalizeWhitespace(input: string): string {
  if (!input) return '';
  return input
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Rate limiter for in-memory use (Edge Functions or client-side)
 * For production, use Redis or similar for distributed rate limiting
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if a request should be allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const timestamps = this.requests.get(key) || [];
    const recentTimestamps = timestamps.filter((t) => t > windowStart);

    if (recentTimestamps.length >= this.maxRequests) {
      return false;
    }

    recentTimestamps.push(now);
    this.requests.set(key, recentTimestamps);

    return true;
  }

  /**
   * Get remaining requests for a key
   */
  getRemainingRequests(key: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const timestamps = this.requests.get(key) || [];
    const recentCount = timestamps.filter((t) => t > windowStart).length;

    return Math.max(0, this.maxRequests - recentCount);
  }

  /**
   * Clear old entries to prevent memory leaks
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, timestamps] of this.requests.entries()) {
      const recentTimestamps = timestamps.filter((t) => t > windowStart);
      if (recentTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recentTimestamps);
      }
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.requests.delete(key);
  }
}

/**
 * CSRF token generation and validation
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const lengthsMatch = a.length === b.length;

  // Use the longer string length to prevent timing attacks based on length
  const compareString = lengthsMatch ? b : a;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ compareString.charCodeAt(i);
  }

  return result === 0 && lengthsMatch;
}

/**
 * Validate Japanese phone number format
 */
export function isValidJapanesePhone(phone: string): boolean {
  const digits = phone.replace(/[\s\-()]/g, '');

  // Mobile phones: 070, 080, 090 followed by 8 digits
  if (/^0[789]0\d{8}$/.test(digits)) return true;

  // Landline: 0 followed by 1-4 area code digits and remaining digits totaling 10
  if (/^0\d{9}$/.test(digits)) return true;

  // IP phones: 050
  if (/^050\d{8}$/.test(digits)) return true;

  return false;
}

/**
 * Validate Japanese postal code format
 */
export function isValidJapanesePostalCode(postalCode: string): boolean {
  const digits = postalCode.replace(/[\s\-]/g, '');
  return /^\d{7}$/.test(digits);
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars) return '****';

  const maskLength = data.length - visibleChars;
  return '*'.repeat(maskLength) + data.slice(-visibleChars);
}

/**
 * Mask email for display
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return maskSensitiveData(email);

  const maskedLocal = local.length <= 2
    ? '*'.repeat(local.length)
    : local[0] + '*'.repeat(local.length - 2) + local[local.length - 1];

  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number for display
 */
export function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';

  return '*'.repeat(digits.length - 4) + digits.slice(-4);
}
