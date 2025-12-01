import { describe, test, expect } from 'vitest';
import {
  checkSqlInjection,
  checkXss,
  sanitizeString,
  validateNumber,
  validateString,
  validateEmail,
  validatePhone,
  validatePostalCode,
  validateDate,
  validateUuid,
  validateBoolean,
  validateEnum,
  validateCurrency,
  validatePercentage,
  validateCsvRow,
} from '../utils/csvValidator';

describe('csvValidator', () => {
  describe('checkSqlInjection', () => {
    test('detects SQL injection patterns', () => {
      expect(checkSqlInjection('SELECT * FROM users')).toBe(true);
      expect(checkSqlInjection("' OR '1'='1")).toBe(true);
      expect(checkSqlInjection('DROP TABLE users')).toBe(true);
      expect(checkSqlInjection('DELETE FROM users')).toBe(true);
      expect(checkSqlInjection('INSERT INTO users')).toBe(true);
      expect(checkSqlInjection('UNION SELECT ')).toBe(true);
      expect(checkSqlInjection('1=1')).toBe(true);
      expect(checkSqlInjection('--')).toBe(true);
      expect(checkSqlInjection('exec sp_')).toBe(true);
    });

    test('allows safe strings', () => {
      expect(checkSqlInjection('田中太郎')).toBe(false);
      expect(checkSqlInjection('hello world')).toBe(false);
      expect(checkSqlInjection('商品コード001')).toBe(false);
      expect(checkSqlInjection('12345')).toBe(false);
    });
  });

  describe('checkXss', () => {
    test('detects XSS patterns', () => {
      expect(checkXss('<script>alert("XSS")</script>')).toBe(true);
      expect(checkXss('javascript:alert(1)')).toBe(true);
      expect(checkXss('<img onerror=alert(1)>')).toBe(true);
      expect(checkXss('<iframe src="evil.com"></iframe>')).toBe(true);
      expect(checkXss('<svg onload=alert(1)>')).toBe(true);
      expect(checkXss('<div onclick=alert(1)>')).toBe(true);  // onclick in tag context
      expect(checkXss('foo data:text/html')).toBe(true);
      expect(checkXss('vbscript:msgbox')).toBe(true);
    });

    test('allows safe strings', () => {
      expect(checkXss('田中太郎')).toBe(false);
      expect(checkXss('hello@example.com')).toBe(false);
      expect(checkXss('普通のテキスト')).toBe(false);
      expect(checkXss('商品説明文')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    test('escapes HTML entities', () => {
      expect(sanitizeString('<script>')).toBe('&lt;script&gt;');
      expect(sanitizeString('"hello"')).toBe('&quot;hello&quot;');
      expect(sanitizeString("it's")).toBe('it&#x27;s');
      expect(sanitizeString('a & b')).toBe('a &amp; b');
    });

    test('removes control characters', () => {
      expect(sanitizeString('hello\x00world')).toBe('helloworld');
      expect(sanitizeString('test\x0Bvalue')).toBe('testvalue');
    });

    test('trims whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
      expect(sanitizeString('\thello\n')).toBe('hello');
    });
  });

  describe('validateNumber', () => {
    test('validates valid numbers', () => {
      expect(validateNumber('123').isValid).toBe(true);
      expect(validateNumber('123').sanitizedValue).toBe(123);
      expect(validateNumber('1,234').sanitizedValue).toBe(1234);
      expect(validateNumber('-100').isValid).toBe(true);
      expect(validateNumber('3.14').isValid).toBe(true);
    });

    test('rejects invalid numbers', () => {
      expect(validateNumber('abc').isValid).toBe(false);
      expect(validateNumber('12a3').isValid).toBe(false);
    });

    test('validates number range', () => {
      expect(validateNumber('50', { min: 0, max: 100 }).isValid).toBe(true);
      expect(validateNumber('150', { min: 0, max: 100 }).isValid).toBe(false);
      expect(validateNumber('-10', { min: 0 }).isValid).toBe(false);
    });

    test('allows empty values', () => {
      expect(validateNumber('').isValid).toBe(true);
      expect(validateNumber('').sanitizedValue).toBe(null);
      expect(validateNumber(null).isValid).toBe(true);
    });
  });

  describe('validateString', () => {
    test('validates required strings', () => {
      expect(validateString('', { required: true }).isValid).toBe(false);
      expect(validateString('hello', { required: true }).isValid).toBe(true);
    });

    test('validates string length', () => {
      expect(validateString('hi', { minLength: 3 }).isValid).toBe(false);
      expect(validateString('hello', { minLength: 3 }).isValid).toBe(true);
      expect(validateString('hello world', { maxLength: 5 }).isValid).toBe(false);
      expect(validateString('hello', { maxLength: 5 }).isValid).toBe(true);
    });

    test('detects SQL injection', () => {
      expect(validateString("'; DROP TABLE users;").isValid).toBe(false);
    });

    test('detects XSS', () => {
      expect(validateString('<script>alert(1)</script>').isValid).toBe(false);
    });
  });

  describe('validateEmail', () => {
    test('validates valid emails', () => {
      expect(validateEmail('test@example.com').isValid).toBe(true);
      expect(validateEmail('user.name@domain.co.jp').isValid).toBe(true);
      expect(validateEmail('test+filter@example.com').isValid).toBe(true);
    });

    test('rejects invalid emails', () => {
      expect(validateEmail('notanemail').isValid).toBe(false);
      expect(validateEmail('missing@domain').isValid).toBe(false);
      expect(validateEmail('@nodomain.com').isValid).toBe(false);
      expect(validateEmail('spaces in@email.com').isValid).toBe(false);
    });

    test('allows empty values', () => {
      expect(validateEmail('').isValid).toBe(true);
      expect(validateEmail(null).isValid).toBe(true);
    });
  });

  describe('validatePhone', () => {
    test('validates valid phone numbers', () => {
      expect(validatePhone('03-1234-5678').isValid).toBe(true);
      expect(validatePhone('090-1234-5678').isValid).toBe(true);
      expect(validatePhone('+81-90-1234-5678').isValid).toBe(true);
      expect(validatePhone('0312345678').isValid).toBe(true);
    });

    test('rejects invalid phone numbers', () => {
      expect(validatePhone('123').isValid).toBe(false);
      expect(validatePhone('abcdefghijk').isValid).toBe(false);
    });

    test('allows empty values', () => {
      expect(validatePhone('').isValid).toBe(true);
    });
  });

  describe('validatePostalCode', () => {
    test('validates Japanese postal codes', () => {
      expect(validatePostalCode('123-4567').isValid).toBe(true);
      expect(validatePostalCode('1234567').isValid).toBe(true);
    });

    test('rejects invalid postal codes', () => {
      expect(validatePostalCode('12345').isValid).toBe(false);
      expect(validatePostalCode('123-456').isValid).toBe(false);
      expect(validatePostalCode('abc-defg').isValid).toBe(false);
    });
  });

  describe('validateDate', () => {
    test('validates valid dates', () => {
      expect(validateDate('2024-01-15').isValid).toBe(true);
      expect(validateDate('2024-01-15T10:30:00').isValid).toBe(true);
      expect(validateDate('2024-01-15T10:30:00Z').isValid).toBe(true);
    });

    test('rejects invalid dates', () => {
      expect(validateDate('not-a-date').isValid).toBe(false);
      expect(validateDate('2024-13-45').isValid).toBe(false);
    });

    test('rejects out of range dates', () => {
      expect(validateDate('1800-01-01').isValid).toBe(false);
      expect(validateDate('2200-01-01').isValid).toBe(false);
    });
  });

  describe('validateUuid', () => {
    test('validates valid UUIDs', () => {
      expect(validateUuid('550e8400-e29b-41d4-a716-446655440000').isValid).toBe(true);
      expect(validateUuid('A550E840-E29B-41D4-A716-446655440000').isValid).toBe(true);
    });

    test('rejects invalid UUIDs', () => {
      expect(validateUuid('not-a-uuid').isValid).toBe(false);
      expect(validateUuid('550e8400-e29b-41d4-a716').isValid).toBe(false);
      expect(validateUuid('123').isValid).toBe(false);
    });
  });

  describe('validateBoolean', () => {
    test('validates true values', () => {
      expect(validateBoolean('true').sanitizedValue).toBe(true);
      expect(validateBoolean('1').sanitizedValue).toBe(true);
      expect(validateBoolean('yes').sanitizedValue).toBe(true);
      expect(validateBoolean('はい').sanitizedValue).toBe(true);
      expect(validateBoolean('TRUE').sanitizedValue).toBe(true);
    });

    test('validates false values', () => {
      expect(validateBoolean('false').sanitizedValue).toBe(false);
      expect(validateBoolean('0').sanitizedValue).toBe(false);
      expect(validateBoolean('no').sanitizedValue).toBe(false);
      expect(validateBoolean('いいえ').sanitizedValue).toBe(false);
    });

    test('rejects invalid values', () => {
      expect(validateBoolean('maybe').isValid).toBe(false);
      expect(validateBoolean('2').isValid).toBe(false);
    });
  });

  describe('validateEnum', () => {
    test('validates allowed values', () => {
      const allowed = ['active', 'inactive', 'pending'];
      expect(validateEnum('active', allowed).isValid).toBe(true);
      expect(validateEnum('inactive', allowed).isValid).toBe(true);
    });

    test('rejects disallowed values', () => {
      const allowed = ['active', 'inactive'];
      expect(validateEnum('unknown', allowed).isValid).toBe(false);
    });
  });

  describe('validateCurrency', () => {
    test('validates valid currency amounts', () => {
      expect(validateCurrency('1000').isValid).toBe(true);
      expect(validateCurrency('0').isValid).toBe(true);
      expect(validateCurrency('999999999').isValid).toBe(true);
    });

    test('rejects invalid currency amounts', () => {
      expect(validateCurrency('-100').isValid).toBe(false);
      expect(validateCurrency('9999999999').isValid).toBe(false);
    });
  });

  describe('validatePercentage', () => {
    test('validates valid percentages', () => {
      expect(validatePercentage('0').isValid).toBe(true);
      expect(validatePercentage('50').isValid).toBe(true);
      expect(validatePercentage('100').isValid).toBe(true);
      expect(validatePercentage('33.33').isValid).toBe(true);
    });

    test('rejects invalid percentages', () => {
      expect(validatePercentage('-10').isValid).toBe(false);
      expect(validatePercentage('150').isValid).toBe(false);
    });
  });

  describe('validateCsvRow', () => {
    test('validates complete row', () => {
      const rules = [
        { field: 'name', type: 'string' as const, required: true },
        { field: 'email', type: 'email' as const },
        { field: 'age', type: 'number' as const, min: 0, max: 150 },
      ];

      const validRow = {
        name: '田中太郎',
        email: 'tanaka@example.com',
        age: '30',
      };

      const result = validateCsvRow(validRow, rules);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('reports validation errors', () => {
      const rules = [
        { field: 'name', type: 'string' as const, required: true },
        { field: 'email', type: 'email' as const },
      ];

      const invalidRow = {
        name: '',
        email: 'invalid-email',
      };

      const result = validateCsvRow(invalidRow, rules);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(2);
    });

    test('sanitizes values', () => {
      const rules = [
        { field: 'name', type: 'string' as const },
      ];

      const row = {
        name: '  <script>alert()</script>  ',
      };

      // This will fail validation due to XSS
      const result = validateCsvRow(row, rules);
      expect(result.isValid).toBe(false);
    });
  });
});
