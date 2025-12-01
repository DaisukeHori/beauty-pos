import {
  sanitizeHtml,
  escapeHtml,
  sanitizeSqlLike,
  isValidUUID,
  isValidIdentifier,
  sanitizeFileName,
  isAllowedFileExtension,
  ALLOWED_IMAGE_EXTENSIONS,
  isValidNumber,
  isValidLength,
  truncate,
  removeControlChars,
  normalizeWhitespace,
  RateLimiter,
  generateCSRFToken,
  timingSafeEqual,
  isValidJapanesePhone,
  isValidJapanesePostalCode,
  maskSensitiveData,
  maskEmail,
  maskPhoneNumber,
} from '../security';

describe('sanitizeHtml', () => {
  it('should remove script tags', () => {
    const input = '<script>alert("xss")</script>Hello';
    expect(sanitizeHtml(input)).toBe('Hello');
  });

  it('should remove event handlers', () => {
    const input = '<img src="x" onerror="alert(1)">';
    expect(sanitizeHtml(input)).not.toContain('onerror');
  });

  it('should remove javascript: URLs', () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    expect(sanitizeHtml(input)).not.toContain('javascript:');
  });

  it('should handle empty input', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(null as any)).toBe('');
  });
});

describe('escapeHtml', () => {
  it('should escape HTML entities', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('"test"')).toBe('&quot;test&quot;');
    expect(escapeHtml("it's")).toBe('it&#x27;s');
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('should handle empty input', () => {
    expect(escapeHtml('')).toBe('');
  });
});

describe('sanitizeSqlLike', () => {
  it('should escape SQL special characters', () => {
    expect(sanitizeSqlLike('test%')).toBe('test\\%');
    expect(sanitizeSqlLike('test_')).toBe('test\\_');
    expect(sanitizeSqlLike("test'")).toBe("test''");
    expect(sanitizeSqlLike('test\\')).toBe('test\\\\');
  });

  it('should handle empty input', () => {
    expect(sanitizeSqlLike('')).toBe('');
  });
});

describe('isValidUUID', () => {
  it('should validate correct UUIDs', () => {
    expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('should reject invalid UUIDs', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('123e4567-e89b-12d3-a456')).toBe(false);
    expect(isValidUUID('')).toBe(false);
  });
});

describe('isValidIdentifier', () => {
  it('should validate correct identifiers', () => {
    expect(isValidIdentifier('myVar')).toBe(true);
    expect(isValidIdentifier('my_var')).toBe(true);
    expect(isValidIdentifier('myVar123')).toBe(true);
    expect(isValidIdentifier('my-var')).toBe(true);
  });

  it('should reject invalid identifiers', () => {
    expect(isValidIdentifier('123abc')).toBe(false);
    expect(isValidIdentifier('my var')).toBe(false);
    expect(isValidIdentifier('')).toBe(false);
  });
});

describe('sanitizeFileName', () => {
  it('should remove path separators', () => {
    expect(sanitizeFileName('../../../etc/passwd')).toBe('etcpasswd');
    expect(sanitizeFileName('folder/file.txt')).toBe('folderfile.txt');
  });

  it('should remove dangerous characters', () => {
    expect(sanitizeFileName('file<>:"|?*.txt')).toBe('file.txt');
  });

  it('should prevent hidden files', () => {
    expect(sanitizeFileName('.hidden')).toBe('hidden');
    expect(sanitizeFileName('...hidden')).toBe('hidden');
  });

  it('should limit length', () => {
    const longName = 'a'.repeat(300);
    expect(sanitizeFileName(longName).length).toBeLessThanOrEqual(255);
  });
});

describe('isAllowedFileExtension', () => {
  it('should allow valid extensions', () => {
    expect(isAllowedFileExtension('photo.jpg', ALLOWED_IMAGE_EXTENSIONS)).toBe(true);
    expect(isAllowedFileExtension('photo.PNG', ALLOWED_IMAGE_EXTENSIONS)).toBe(true);
  });

  it('should reject invalid extensions', () => {
    expect(isAllowedFileExtension('script.js', ALLOWED_IMAGE_EXTENSIONS)).toBe(false);
    expect(isAllowedFileExtension('file', ALLOWED_IMAGE_EXTENSIONS)).toBe(false);
  });
});

describe('isValidNumber', () => {
  it('should validate numbers in range', () => {
    expect(isValidNumber(50, { min: 0, max: 100 })).toBe(true);
    expect(isValidNumber(0, { min: 0, max: 100 })).toBe(true);
    expect(isValidNumber(100, { min: 0, max: 100 })).toBe(true);
  });

  it('should reject numbers out of range', () => {
    expect(isValidNumber(-1, { min: 0, max: 100 })).toBe(false);
    expect(isValidNumber(101, { min: 0, max: 100 })).toBe(false);
  });

  it('should handle decimal validation', () => {
    expect(isValidNumber(3.14, { allowDecimal: true })).toBe(true);
    expect(isValidNumber(3.14, { allowDecimal: false })).toBe(false);
    expect(isValidNumber(3, { allowDecimal: false })).toBe(true);
  });

  it('should reject invalid inputs', () => {
    expect(isValidNumber(NaN)).toBe(false);
    expect(isValidNumber(Infinity)).toBe(false);
    expect(isValidNumber('5' as any)).toBe(false);
  });
});

describe('isValidLength', () => {
  it('should validate string length', () => {
    expect(isValidLength('hello', { min: 1, max: 10 })).toBe(true);
    expect(isValidLength('', { min: 0, max: 10 })).toBe(true);
  });

  it('should reject invalid lengths', () => {
    expect(isValidLength('', { min: 1 })).toBe(false);
    expect(isValidLength('hello world', { max: 5 })).toBe(false);
  });
});

describe('truncate', () => {
  it('should truncate long strings', () => {
    expect(truncate('Hello World', 5)).toBe('Hello');
  });

  it('should not truncate short strings', () => {
    expect(truncate('Hi', 5)).toBe('Hi');
  });
});

describe('removeControlChars', () => {
  it('should remove control characters', () => {
    expect(removeControlChars('Hello\x00World')).toBe('HelloWorld');
    expect(removeControlChars('Test\x1FData')).toBe('TestData');
  });

  it('should preserve normal text', () => {
    expect(removeControlChars('Hello World')).toBe('Hello World');
    expect(removeControlChars('日本語テスト')).toBe('日本語テスト');
  });
});

describe('normalizeWhitespace', () => {
  it('should normalize whitespace', () => {
    expect(normalizeWhitespace('  hello   world  ')).toBe('hello world');
    expect(normalizeWhitespace('a\n\nb\t\tc')).toBe('a b c');
  });
});

describe('RateLimiter', () => {
  it('should allow requests within limit', () => {
    const limiter = new RateLimiter(1000, 3);
    expect(limiter.isAllowed('test-key')).toBe(true);
    expect(limiter.isAllowed('test-key')).toBe(true);
    expect(limiter.isAllowed('test-key')).toBe(true);
  });

  it('should block requests over limit', () => {
    const limiter = new RateLimiter(1000, 2);
    limiter.isAllowed('test-key');
    limiter.isAllowed('test-key');
    expect(limiter.isAllowed('test-key')).toBe(false);
  });

  it('should track different keys separately', () => {
    const limiter = new RateLimiter(1000, 1);
    expect(limiter.isAllowed('key1')).toBe(true);
    expect(limiter.isAllowed('key2')).toBe(true);
  });

  it('should return remaining requests', () => {
    const limiter = new RateLimiter(1000, 5);
    limiter.isAllowed('test-key');
    limiter.isAllowed('test-key');
    expect(limiter.getRemainingRequests('test-key')).toBe(3);
  });
});

describe('generateCSRFToken', () => {
  it('should generate a 64 character hex token', () => {
    const token = generateCSRFToken();
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it('should generate unique tokens', () => {
    const token1 = generateCSRFToken();
    const token2 = generateCSRFToken();
    expect(token1).not.toBe(token2);
  });
});

describe('timingSafeEqual', () => {
  it('should return true for equal strings', () => {
    expect(timingSafeEqual('hello', 'hello')).toBe(true);
  });

  it('should return false for different strings', () => {
    expect(timingSafeEqual('hello', 'world')).toBe(false);
    expect(timingSafeEqual('hello', 'hello!')).toBe(false);
  });
});

describe('isValidJapanesePhone', () => {
  it('should validate mobile phone numbers', () => {
    expect(isValidJapanesePhone('090-1234-5678')).toBe(true);
    expect(isValidJapanesePhone('080-1234-5678')).toBe(true);
    expect(isValidJapanesePhone('070-1234-5678')).toBe(true);
  });

  it('should validate landline numbers', () => {
    expect(isValidJapanesePhone('03-1234-5678')).toBe(true);
    expect(isValidJapanesePhone('0123-45-6789')).toBe(true);
  });

  it('should validate IP phone numbers', () => {
    expect(isValidJapanesePhone('050-1234-5678')).toBe(true);
  });

  it('should reject invalid numbers', () => {
    expect(isValidJapanesePhone('123-4567')).toBe(false);
    expect(isValidJapanesePhone('090-123-456')).toBe(false);
  });
});

describe('isValidJapanesePostalCode', () => {
  it('should validate correct postal codes', () => {
    expect(isValidJapanesePostalCode('123-4567')).toBe(true);
    expect(isValidJapanesePostalCode('1234567')).toBe(true);
  });

  it('should reject invalid postal codes', () => {
    expect(isValidJapanesePostalCode('12345')).toBe(false);
    expect(isValidJapanesePostalCode('12345678')).toBe(false);
  });
});

describe('maskSensitiveData', () => {
  it('should mask data with last 4 chars visible', () => {
    expect(maskSensitiveData('1234567890')).toBe('******7890');
    expect(maskSensitiveData('password123')).toBe('*******d123'); // 11 chars: 7 masked + 4 visible
  });

  it('should handle short strings', () => {
    expect(maskSensitiveData('abc')).toBe('****');
  });
});

describe('maskEmail', () => {
  it('should mask email addresses', () => {
    expect(maskEmail('test@example.com')).toBe('t**t@example.com');
    expect(maskEmail('ab@test.com')).toBe('**@test.com');
  });
});

describe('maskPhoneNumber', () => {
  it('should mask phone numbers', () => {
    expect(maskPhoneNumber('090-1234-5678')).toBe('*******5678');
    expect(maskPhoneNumber('03-1234-5678')).toBe('******5678');
  });
});
