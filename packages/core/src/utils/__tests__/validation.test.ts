import {
  validateCustomerData,
  validateMenuData,
  validateStaffData,
  validateReservationData,
  validatePaymentData,
  validateTicketData,
  validateCouponData,
} from '../index';

describe('validateCustomerData', () => {
  it('should validate correct customer data', () => {
    const result = validateCustomerData({
      last_name: '田中',
      first_name: '太郎',
      phone: '090-1234-5678',
      email: 'tanaka@example.com',
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should require last_name', () => {
    const result = validateCustomerData({
      first_name: '太郎',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('姓は必須です');
  });

  it('should require first_name', () => {
    const result = validateCustomerData({
      last_name: '田中',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('名は必須です');
  });

  it('should validate phone format', () => {
    const result = validateCustomerData({
      last_name: '田中',
      first_name: '太郎',
      phone: 'invalid',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('電話番号の形式が正しくありません');
  });

  it('should validate email format', () => {
    const result = validateCustomerData({
      last_name: '田中',
      first_name: '太郎',
      email: 'invalid-email',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('メールアドレスの形式が正しくありません');
  });

  it('should enforce name length limits', () => {
    const result = validateCustomerData({
      last_name: 'a'.repeat(51),
      first_name: '太郎',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('姓は50文字以内で入力してください');
  });
});

describe('validateMenuData', () => {
  it('should validate correct menu data', () => {
    const result = validateMenuData({
      name: 'カット',
      price: 5000,
      duration: 60,
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should require name', () => {
    const result = validateMenuData({
      price: 5000,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('メニュー名は必須です');
  });

  it('should require price', () => {
    const result = validateMenuData({
      name: 'カット',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('価格は必須です');
  });

  it('should reject negative price', () => {
    const result = validateMenuData({
      name: 'カット',
      price: -100,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('価格は0以上で入力してください');
  });

  it('should validate duration range', () => {
    const result = validateMenuData({
      name: 'カット',
      price: 5000,
      duration: 500,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('施術時間は8時間以内で入力してください');
  });
});

describe('validateStaffData', () => {
  it('should validate correct staff data', () => {
    const result = validateStaffData({
      last_name: '山田',
      first_name: '花子',
      email: 'yamada@salon.com',
      employee_code: 'EMP001',
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should require all fields', () => {
    const result = validateStaffData({});
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('姓は必須です');
    expect(result.errors).toContain('名は必須です');
    expect(result.errors).toContain('メールアドレスは必須です');
  });

  it('should validate email format', () => {
    const result = validateStaffData({
      last_name: '山田',
      first_name: '花子',
      email: 'invalid',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('メールアドレスの形式が正しくありません');
  });

  it('should validate employee_code length', () => {
    const result = validateStaffData({
      last_name: '山田',
      first_name: '花子',
      email: 'yamada@salon.com',
      employee_code: 'E'.repeat(21),
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('従業員コードは20文字以内で入力してください');
  });
});

describe('validateReservationData', () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);

  it('should validate correct reservation data', () => {
    const result = validateReservationData({
      customer_id: 'cust-123',
      staff_id: 'staff-456',
      start_time: futureDate.toISOString(),
      menu_ids: ['menu-1', 'menu-2'],
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should require customer_id', () => {
    const result = validateReservationData({
      staff_id: 'staff-456',
      start_time: futureDate.toISOString(),
      menu_ids: ['menu-1'],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('顧客を選択してください');
  });

  it('should require staff_id', () => {
    const result = validateReservationData({
      customer_id: 'cust-123',
      start_time: futureDate.toISOString(),
      menu_ids: ['menu-1'],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('担当スタッフを選択してください');
  });

  it('should require menu_ids', () => {
    const result = validateReservationData({
      customer_id: 'cust-123',
      staff_id: 'staff-456',
      start_time: futureDate.toISOString(),
      menu_ids: [],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('メニューを1つ以上選択してください');
  });

  it('should reject past dates', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const result = validateReservationData({
      customer_id: 'cust-123',
      staff_id: 'staff-456',
      start_time: pastDate.toISOString(),
      menu_ids: ['menu-1'],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('過去の日時は予約できません');
  });
});

describe('validatePaymentData', () => {
  it('should validate correct cash payment', () => {
    const result = validatePaymentData({
      amount: 10000,
      payment_method: 'cash',
      received_amount: 10000,
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate credit card payment without received_amount', () => {
    const result = validatePaymentData({
      amount: 10000,
      payment_method: 'credit_card',
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should require sufficient received_amount for cash', () => {
    const result = validatePaymentData({
      amount: 10000,
      payment_method: 'cash',
      received_amount: 5000,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('受取金額が不足しています');
  });

  it('should reject invalid payment method', () => {
    const result = validatePaymentData({
      amount: 10000,
      payment_method: 'bitcoin',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('無効な支払方法です');
  });
});

describe('validateTicketData', () => {
  it('should validate correct ticket data', () => {
    const result = validateTicketData({
      name: '回数券5回',
      price: 20000,
      uses_total: 5,
      valid_months: 6,
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should require name', () => {
    const result = validateTicketData({
      price: 20000,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('チケット名は必須です');
  });

  it('should validate uses_total', () => {
    const result = validateTicketData({
      name: '回数券',
      price: 20000,
      uses_total: 0,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('利用回数は1回以上で設定してください');
  });

  it('should validate valid_months range', () => {
    const result = validateTicketData({
      name: '回数券',
      price: 20000,
      valid_months: 25,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('有効期間は1〜24ヶ月で設定してください');
  });
});

describe('validateCouponData', () => {
  it('should validate correct coupon data', () => {
    const result = validateCouponData({
      code: 'SAVE10',
      name: '10%オフクーポン',
      discount_type: 'percentage',
      discount_value: 10,
      min_purchase: 1000,
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should require code', () => {
    const result = validateCouponData({
      name: 'クーポン',
      discount_type: 'fixed',
      discount_value: 500,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('クーポンコードは必須です');
  });

  it('should validate code format', () => {
    const result = validateCouponData({
      code: 'AB',
      name: 'クーポン',
      discount_type: 'fixed',
      discount_value: 500,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('クーポンコードは4〜20文字の英数字で入力してください');
  });

  it('should validate percentage not over 100', () => {
    const result = validateCouponData({
      code: 'SAVE150',
      name: '150%オフクーポン',
      discount_type: 'percentage',
      discount_value: 150,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('割引率は100%以下で入力してください');
  });
});
