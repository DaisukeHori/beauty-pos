// Security utilities
export * from './security';

// Validation schemas for common data types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate customer data
 */
export function validateCustomerData(data: {
  last_name?: string;
  first_name?: string;
  phone?: string;
  email?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.last_name?.trim()) {
    errors.push('姓は必須です');
  } else if (data.last_name.length > 50) {
    errors.push('姓は50文字以内で入力してください');
  }

  if (!data.first_name?.trim()) {
    errors.push('名は必須です');
  } else if (data.first_name.length > 50) {
    errors.push('名は50文字以内で入力してください');
  }

  if (data.phone) {
    const phoneDigits = data.phone.replace(/[\s\-()]/g, '');
    if (!/^0\d{9,10}$/.test(phoneDigits)) {
      errors.push('電話番号の形式が正しくありません');
    }
  }

  if (data.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('メールアドレスの形式が正しくありません');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate menu data
 */
export function validateMenuData(data: {
  name?: string;
  price?: number;
  duration?: number;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push('メニュー名は必須です');
  } else if (data.name.length > 100) {
    errors.push('メニュー名は100文字以内で入力してください');
  }

  if (data.price === undefined || data.price === null) {
    errors.push('価格は必須です');
  } else if (data.price < 0) {
    errors.push('価格は0以上で入力してください');
  } else if (data.price > 9999999) {
    errors.push('価格が上限を超えています');
  }

  if (data.duration !== undefined && data.duration !== null) {
    if (data.duration < 1) {
      errors.push('施術時間は1分以上で入力してください');
    } else if (data.duration > 480) {
      errors.push('施術時間は8時間以内で入力してください');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate staff data
 */
export function validateStaffData(data: {
  last_name?: string;
  first_name?: string;
  email?: string;
  employee_code?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.last_name?.trim()) {
    errors.push('姓は必須です');
  }

  if (!data.first_name?.trim()) {
    errors.push('名は必須です');
  }

  if (!data.email?.trim()) {
    errors.push('メールアドレスは必須です');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('メールアドレスの形式が正しくありません');
    }
  }

  if (data.employee_code && data.employee_code.length > 20) {
    errors.push('従業員コードは20文字以内で入力してください');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate reservation data
 */
export function validateReservationData(data: {
  customer_id?: string;
  staff_id?: string;
  start_time?: string | Date;
  menu_ids?: string[];
}): ValidationResult {
  const errors: string[] = [];

  if (!data.customer_id) {
    errors.push('顧客を選択してください');
  }

  if (!data.staff_id) {
    errors.push('担当スタッフを選択してください');
  }

  if (!data.start_time) {
    errors.push('予約日時を選択してください');
  } else {
    const startDate = new Date(data.start_time);
    if (isNaN(startDate.getTime())) {
      errors.push('予約日時の形式が正しくありません');
    } else if (startDate < new Date()) {
      errors.push('過去の日時は予約できません');
    }
  }

  if (!data.menu_ids || data.menu_ids.length === 0) {
    errors.push('メニューを1つ以上選択してください');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate sale/payment data
 */
export function validatePaymentData(data: {
  amount?: number;
  payment_method?: string;
  received_amount?: number;
}): ValidationResult {
  const errors: string[] = [];

  if (data.amount === undefined || data.amount === null) {
    errors.push('金額は必須です');
  } else if (data.amount < 0) {
    errors.push('金額は0以上で入力してください');
  }

  const validMethods = ['cash', 'credit_card', 'ic_card', 'qr', 'coupon', 'point', 'other'];
  if (!data.payment_method) {
    errors.push('支払方法を選択してください');
  } else if (!validMethods.includes(data.payment_method)) {
    errors.push('無効な支払方法です');
  }

  if (data.payment_method === 'cash') {
    if (data.received_amount === undefined || data.received_amount === null) {
      errors.push('受取金額を入力してください');
    } else if (data.received_amount < (data.amount || 0)) {
      errors.push('受取金額が不足しています');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate ticket data
 */
export function validateTicketData(data: {
  name?: string;
  price?: number;
  uses_total?: number;
  valid_months?: number;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push('チケット名は必須です');
  }

  if (data.price === undefined || data.price < 0) {
    errors.push('価格は0以上で入力してください');
  }

  if (data.uses_total !== undefined && data.uses_total < 1) {
    errors.push('利用回数は1回以上で設定してください');
  }

  if (data.valid_months !== undefined && (data.valid_months < 1 || data.valid_months > 24)) {
    errors.push('有効期間は1〜24ヶ月で設定してください');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate coupon data
 */
export function validateCouponData(data: {
  code?: string;
  name?: string;
  discount_type?: string;
  discount_value?: number;
  min_purchase?: number;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.code?.trim()) {
    errors.push('クーポンコードは必須です');
  } else if (!/^[A-Z0-9]{4,20}$/.test(data.code.toUpperCase())) {
    errors.push('クーポンコードは4〜20文字の英数字で入力してください');
  }

  if (!data.name?.trim()) {
    errors.push('クーポン名は必須です');
  }

  const validTypes = ['percentage', 'fixed'];
  if (!data.discount_type || !validTypes.includes(data.discount_type)) {
    errors.push('割引タイプを選択してください');
  }

  if (data.discount_value === undefined || data.discount_value <= 0) {
    errors.push('割引額は1以上で入力してください');
  }

  if (data.discount_type === 'percentage' && data.discount_value && data.discount_value > 100) {
    errors.push('割引率は100%以下で入力してください');
  }

  if (data.min_purchase !== undefined && data.min_purchase < 0) {
    errors.push('最低購入金額は0以上で入力してください');
  }

  return { isValid: errors.length === 0, errors };
}
