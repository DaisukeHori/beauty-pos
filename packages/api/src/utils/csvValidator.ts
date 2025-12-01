/**
 * CSVインポート用バリデーションシステム
 * - SQLインジェクション防止
 * - XSS防止
 * - データ型検証
 * - ビジネスルール検証
 */

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedValue?: unknown;
}

// 危険なSQLパターン
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE|UNION|OR|AND)\b\s+)/i,
  /('|"|;|--|\*|\/\*|\*\/)/,
  /(\b(1=1|1 = 1|'='|"=")\b)/i,
  /(xp_|sp_|exec\s|execute\s)/i,
];

// 危険なXSSパターン
const XSS_PATTERNS = [
  /<script\b[^>]*>(.*?)<\/script>/gi,
  /javascript:/gi,
  /\bon\w+\s*=/gi,  // イベントハンドラ属性（onclick, onerror等）
  /<iframe\b[^>]*>(.*?)<\/iframe>/gi,
  /<object\b[^>]*>(.*?)<\/object>/gi,
  /<embed\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /\bdata:/gi,      // data: URIスキーム
  /vbscript:/gi,
  /<svg\b[^>]*onload/gi,
];

// メール形式
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// 電話番号形式（日本・国際）
const PHONE_REGEX = /^[\d\-\+\(\)\s]{10,20}$/;

// 郵便番号形式（日本）
const POSTAL_CODE_REGEX = /^\d{3}-?\d{4}$/;

// 日付形式
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;

// UUID形式
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * SQLインジェクションチェック
 */
export function checkSqlInjection(value: string): boolean {
  if (typeof value !== 'string') return false;
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * XSSチェック
 */
export function checkXss(value: string): boolean {
  if (typeof value !== 'string') return false;
  // Reset lastIndex for each pattern (needed for global regex)
  return XSS_PATTERNS.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}

/**
 * 文字列のサニタイズ
 */
export function sanitizeString(value: string): string {
  if (typeof value !== 'string') return '';

  return value
    // HTMLエンティティをエスケープ
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    // 制御文字を除去
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // 前後の空白を除去
    .trim();
}

/**
 * 数値の検証・サニタイズ
 */
export function validateNumber(
  value: unknown,
  options?: { min?: number; max?: number; allowNegative?: boolean; allowDecimal?: boolean }
): ValidationResult {
  const errors: ValidationError[] = [];

  if (value === null || value === undefined || value === '') {
    return { isValid: true, errors: [], sanitizedValue: null };
  }

  const strValue = String(value).replace(/,/g, '');
  const numValue = Number(strValue);

  if (isNaN(numValue)) {
    errors.push({ field: '', message: '有効な数値ではありません', value });
    return { isValid: false, errors };
  }

  if (options?.allowNegative === false && numValue < 0) {
    errors.push({ field: '', message: '負の値は許可されていません', value });
  }

  if (options?.allowDecimal === false && !Number.isInteger(numValue)) {
    errors.push({ field: '', message: '小数は許可されていません', value });
  }

  if (options?.min !== undefined && numValue < options.min) {
    errors.push({ field: '', message: `最小値は${options.min}です`, value });
  }

  if (options?.max !== undefined && numValue > options.max) {
    errors.push({ field: '', message: `最大値は${options.max}です`, value });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: numValue,
  };
}

/**
 * 文字列の検証・サニタイズ
 */
export function validateString(
  value: unknown,
  options?: { minLength?: number; maxLength?: number; pattern?: RegExp; required?: boolean }
): ValidationResult {
  const errors: ValidationError[] = [];

  if (value === null || value === undefined || value === '') {
    if (options?.required) {
      errors.push({ field: '', message: '必須項目です', value });
      return { isValid: false, errors };
    }
    return { isValid: true, errors: [], sanitizedValue: null };
  }

  const strValue = String(value);

  // セキュリティチェック
  if (checkSqlInjection(strValue)) {
    errors.push({ field: '', message: '不正な文字列が含まれています（SQL）', value });
  }

  if (checkXss(strValue)) {
    errors.push({ field: '', message: '不正な文字列が含まれています（XSS）', value });
  }

  // 長さチェック
  if (options?.minLength !== undefined && strValue.length < options.minLength) {
    errors.push({ field: '', message: `最小文字数は${options.minLength}文字です`, value });
  }

  if (options?.maxLength !== undefined && strValue.length > options.maxLength) {
    errors.push({ field: '', message: `最大文字数は${options.maxLength}文字です`, value });
  }

  // パターンチェック
  if (options?.pattern && !options.pattern.test(strValue)) {
    errors.push({ field: '', message: '形式が正しくありません', value });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitizeString(strValue),
  };
}

/**
 * メールアドレスの検証
 */
export function validateEmail(value: unknown): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return { isValid: true, errors: [], sanitizedValue: null };
  }

  const strValue = String(value).trim().toLowerCase();
  const errors: ValidationError[] = [];

  if (!EMAIL_REGEX.test(strValue)) {
    errors.push({ field: '', message: 'メールアドレスの形式が正しくありません', value });
  }

  // セキュリティチェック
  if (checkSqlInjection(strValue) || checkXss(strValue)) {
    errors.push({ field: '', message: '不正な文字列が含まれています', value });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: strValue,
  };
}

/**
 * 電話番号の検証
 */
export function validatePhone(value: unknown): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return { isValid: true, errors: [], sanitizedValue: null };
  }

  const strValue = String(value).trim();
  const errors: ValidationError[] = [];

  if (!PHONE_REGEX.test(strValue)) {
    errors.push({ field: '', message: '電話番号の形式が正しくありません', value });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: strValue.replace(/[^\d\-\+]/g, ''),
  };
}

/**
 * 郵便番号の検証
 */
export function validatePostalCode(value: unknown): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return { isValid: true, errors: [], sanitizedValue: null };
  }

  const strValue = String(value).trim();
  const errors: ValidationError[] = [];

  if (!POSTAL_CODE_REGEX.test(strValue)) {
    errors.push({ field: '', message: '郵便番号の形式が正しくありません（例: 123-4567）', value });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: strValue,
  };
}

/**
 * 日付の検証
 */
export function validateDate(value: unknown): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return { isValid: true, errors: [], sanitizedValue: null };
  }

  const strValue = String(value).trim();
  const errors: ValidationError[] = [];

  // 日付形式をチェック
  const date = new Date(strValue);
  if (isNaN(date.getTime())) {
    errors.push({ field: '', message: '日付の形式が正しくありません', value });
    return { isValid: false, errors };
  }

  // 合理的な範囲（1900年〜2100年）
  const year = date.getFullYear();
  if (year < 1900 || year > 2100) {
    errors.push({ field: '', message: '日付が範囲外です（1900年〜2100年）', value });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: date.toISOString(),
  };
}

/**
 * UUIDの検証
 */
export function validateUuid(value: unknown): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return { isValid: true, errors: [], sanitizedValue: null };
  }

  const strValue = String(value).trim().toLowerCase();
  const errors: ValidationError[] = [];

  if (!UUID_REGEX.test(strValue)) {
    errors.push({ field: '', message: 'IDの形式が正しくありません', value });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: strValue,
  };
}

/**
 * 真偽値の検証
 */
export function validateBoolean(value: unknown): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return { isValid: true, errors: [], sanitizedValue: null };
  }

  const strValue = String(value).toLowerCase().trim();
  const trueValues = ['true', '1', 'yes', 'はい'];
  const falseValues = ['false', '0', 'no', 'いいえ'];

  if (trueValues.includes(strValue)) {
    return { isValid: true, errors: [], sanitizedValue: true };
  }
  if (falseValues.includes(strValue)) {
    return { isValid: true, errors: [], sanitizedValue: false };
  }

  return {
    isValid: false,
    errors: [{ field: '', message: '真偽値の形式が正しくありません（true/false）', value }],
  };
}

/**
 * 列挙値の検証
 */
export function validateEnum(value: unknown, allowedValues: string[]): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return { isValid: true, errors: [], sanitizedValue: null };
  }

  const strValue = String(value).trim();
  const errors: ValidationError[] = [];

  if (!allowedValues.includes(strValue)) {
    errors.push({
      field: '',
      message: `許可された値は: ${allowedValues.join(', ')}`,
      value,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: strValue,
  };
}

/**
 * 金額の検証（日本円）
 */
export function validateCurrency(value: unknown): ValidationResult {
  return validateNumber(value, {
    min: 0,
    max: 999999999, // 10億円未満
    allowNegative: false,
    allowDecimal: false,
  });
}

/**
 * パーセンテージの検証
 */
export function validatePercentage(value: unknown): ValidationResult {
  return validateNumber(value, {
    min: 0,
    max: 100,
    allowNegative: false,
    allowDecimal: true,
  });
}

/**
 * CSVインポート用の総合バリデーション
 */
export interface FieldValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'phone' | 'postalCode' | 'uuid' | 'currency' | 'percentage' | 'enum';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enumValues?: string[];
}

export function validateCsvRow(
  row: Record<string, unknown>,
  rules: FieldValidationRule[]
): { isValid: boolean; errors: ValidationError[]; sanitizedRow: Record<string, unknown> } {
  const errors: ValidationError[] = [];
  const sanitizedRow: Record<string, unknown> = {};

  for (const rule of rules) {
    const value = row[rule.field];
    let result: ValidationResult;

    switch (rule.type) {
      case 'string':
        result = validateString(value, {
          required: rule.required,
          minLength: rule.minLength,
          maxLength: rule.maxLength,
          pattern: rule.pattern,
        });
        break;
      case 'number':
        result = validateNumber(value, {
          min: rule.min,
          max: rule.max,
        });
        break;
      case 'boolean':
        result = validateBoolean(value);
        break;
      case 'date':
        result = validateDate(value);
        break;
      case 'email':
        result = validateEmail(value);
        break;
      case 'phone':
        result = validatePhone(value);
        break;
      case 'postalCode':
        result = validatePostalCode(value);
        break;
      case 'uuid':
        result = validateUuid(value);
        break;
      case 'currency':
        result = validateCurrency(value);
        break;
      case 'percentage':
        result = validatePercentage(value);
        break;
      case 'enum':
        result = validateEnum(value, rule.enumValues || []);
        break;
      default:
        result = { isValid: true, errors: [], sanitizedValue: value };
    }

    if (!result.isValid) {
      errors.push(...result.errors.map(e => ({ ...e, field: rule.field })));
    }

    sanitizedRow[rule.field] = result.sanitizedValue;
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedRow,
  };
}

export default {
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
};
