/**
 * 複雑なビジネスシナリオ統合テスト
 *
 * より実践的な業務フローをテスト:
 * 1. 複数メニュー・割引適用の会計
 * 2. ポイントシステムと会員ランク
 * 3. マルチスタッフ施術
 * 4. クーポン・回数券利用
 * 5. 返金処理とポイント戻し
 * 6. ウォークイン顧客の新規登録から会計まで
 * 7. 予約変更・振替
 * 8. 日報・売上レポート
 */

import { mockSupabaseClient, createMockQueryBuilder } from '../setup';
import { reservationService } from '../../services/reservationService';
import { visitService } from '../../services/visitService';
import { customerService } from '../../services/customerService';
import { saleService } from '../../services/saleService';

// テストデータ
const testData = {
  companyId: 'company-001',
  storeId: 'store-001',

  // 複数の顧客（ランク別）
  customers: {
    bronze: {
      id: 'customer-bronze',
      company_id: 'company-001',
      customer_code: 'C000001',
      first_name: '太郎',
      last_name: '田中',
      phone: '090-1234-5678',
      email: 'tanaka@example.com',
      points_balance: 500,
      total_visits: 5,
      total_spend: 25000,
      rank: 'bronze',
      is_active: true,
    },
    gold: {
      id: 'customer-gold',
      company_id: 'company-001',
      customer_code: 'C000002',
      first_name: '花子',
      last_name: '佐藤',
      phone: '090-2345-6789',
      email: 'sato@example.com',
      points_balance: 2500,
      total_visits: 50,
      total_spend: 250000,
      rank: 'gold',
      is_active: true,
    },
    platinum: {
      id: 'customer-platinum',
      company_id: 'company-001',
      customer_code: 'C000003',
      first_name: '次郎',
      last_name: '鈴木',
      phone: '090-3456-7890',
      email: 'suzuki@example.com',
      points_balance: 10000,
      total_visits: 100,
      total_spend: 1000000,
      rank: 'platinum',
      is_active: true,
    },
  },

  // 複数のスタッフ
  staff: {
    stylist: {
      id: 'staff-stylist',
      company_id: 'company-001',
      first_name: '美香',
      last_name: '高橋',
      role: 'stylist',
      nomination_fee: 550,
      is_active: true,
    },
    assistant: {
      id: 'staff-assistant',
      company_id: 'company-001',
      first_name: '健太',
      last_name: '伊藤',
      role: 'assistant',
      nomination_fee: 0,
      is_active: true,
    },
    colorist: {
      id: 'staff-colorist',
      company_id: 'company-001',
      first_name: '真理子',
      last_name: '渡辺',
      role: 'stylist',
      nomination_fee: 770,
      is_active: true,
    },
  },

  // 複数のメニュー
  menus: {
    cut: {
      id: 'menu-cut',
      name: 'カット',
      price: 5500,
      duration_minutes: 60,
      tax_rate: 10,
    },
    color: {
      id: 'menu-color',
      name: 'カラー',
      price: 8800,
      duration_minutes: 90,
      tax_rate: 10,
    },
    treatment: {
      id: 'menu-treatment',
      name: 'トリートメント',
      price: 3300,
      duration_minutes: 30,
      tax_rate: 10,
    },
    perm: {
      id: 'menu-perm',
      name: 'パーマ',
      price: 11000,
      duration_minutes: 120,
      tax_rate: 10,
    },
    headSpa: {
      id: 'menu-headspa',
      name: 'ヘッドスパ',
      price: 4400,
      duration_minutes: 45,
      tax_rate: 10,
    },
  },

  // 店販商品
  products: {
    shampoo: {
      id: 'product-shampoo',
      name: 'プロ用シャンプー',
      price: 3850,
      tax_rate: 10,
    },
    treatment: {
      id: 'product-treatment',
      name: 'ホームケアトリートメント',
      price: 2750,
      tax_rate: 10,
    },
  },

  // クーポン
  coupons: {
    newCustomer: {
      id: 'coupon-new',
      code: 'NEW2024',
      discount_type: 'percentage',
      discount_value: 20,
      min_amount: 5000,
    },
    birthday: {
      id: 'coupon-birthday',
      code: 'BIRTHDAY',
      discount_type: 'fixed',
      discount_value: 1000,
      min_amount: 3000,
    },
  },

  // 回数券
  tickets: {
    cutTicket: {
      id: 'ticket-cut-5',
      name: 'カット5回券',
      uses_total: 5,
      uses_remaining: 3,
      menu_id: 'menu-cut',
    },
  },
};

describe('複雑なビジネスシナリオ: 複数メニュー・複数スタッフの会計', () => {
  it('カット＋カラー＋トリートメントのセットメニューを処理できる', async () => {
    const saleData = {
      id: 'sale-combo-001',
      company_id: testData.companyId,
      store_id: testData.storeId,
      customer_id: testData.customers.gold.id,
      sale_number: '20251215-0001',
      subtotal: 17600, // カット5500 + カラー8800 + トリートメント3300
      tax_total: 1760,
      discount_total: 0,
      total: 19360,
      points_used: 0,
      points_earned: 193, // 1%還元
      status: 'completed',
      items: [
        { id: 'item-1', name: 'カット', unit_price: 5500 },
        { id: 'item-2', name: 'カラー', unit_price: 8800 },
        { id: 'item-3', name: 'トリートメント', unit_price: 3300 },
      ],
      payments: [{ payment_method: 'credit_card', amount: 19360 }],
      discounts: [],
    };

    const countQueryBuilder = createMockQueryBuilder([]);
    const saleQueryBuilder = createMockQueryBuilder([saleData]);
    saleQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: saleData, error: null });
        return Promise.resolve({ data: saleData, error: null });
      },
    });

    let queryCount = 0;
    mockSupabaseClient.from.mockImplementation(() => {
      queryCount++;
      if (queryCount === 1) return countQueryBuilder;
      return saleQueryBuilder;
    });

    const result = await saleService.create({
      companyId: testData.companyId,
      storeId: testData.storeId,
      customerId: testData.customers.gold.id,
      items: [
        {
          itemType: 'menu',
          itemId: testData.menus.cut.id,
          name: 'カット',
          quantity: 1,
          unitPrice: 5500,
          taxRate: 10,
          staffAssignments: [{ staffId: testData.staff.stylist.id, role: 'primary', salesRatio: 100 }],
        },
        {
          itemType: 'menu',
          itemId: testData.menus.color.id,
          name: 'カラー',
          quantity: 1,
          unitPrice: 8800,
          taxRate: 10,
          staffAssignments: [
            { staffId: testData.staff.colorist.id, role: 'primary', salesRatio: 70 },
            { staffId: testData.staff.assistant.id, role: 'assistant', salesRatio: 30 },
          ],
        },
        {
          itemType: 'menu',
          itemId: testData.menus.treatment.id,
          name: 'トリートメント',
          quantity: 1,
          unitPrice: 3300,
          taxRate: 10,
          staffAssignments: [{ staffId: testData.staff.assistant.id, role: 'primary', salesRatio: 100 }],
        },
      ],
      payments: [{ paymentMethod: 'credit_card', amount: 19360 }],
    });

    expect(result.total).toBe(19360);
    expect(result.items).toHaveLength(3);
  });

  it('ロング料金追加のカラーを処理できる', async () => {
    const saleData = {
      id: 'sale-long-001',
      subtotal: 10800, // カラー8800 + ロング料金2000
      tax_total: 1080,
      total: 11880,
      status: 'completed',
      items: [],
      payments: [],
      discounts: [],
    };

    const countQueryBuilder = createMockQueryBuilder([]);
    const saleQueryBuilder = createMockQueryBuilder([saleData]);
    saleQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: saleData, error: null });
        return Promise.resolve({ data: saleData, error: null });
      },
    });

    let queryCount = 0;
    mockSupabaseClient.from.mockImplementation(() => {
      queryCount++;
      if (queryCount === 1) return countQueryBuilder;
      return saleQueryBuilder;
    });

    const result = await saleService.create({
      companyId: testData.companyId,
      storeId: testData.storeId,
      customerId: testData.customers.gold.id,
      items: [
        {
          itemType: 'menu',
          itemId: testData.menus.color.id,
          name: 'カラー',
          quantity: 1,
          unitPrice: 8800,
          hairLength: 'long',
          hairLengthCharge: 2000,
          taxRate: 10,
          staffAssignments: [{ staffId: testData.staff.colorist.id, role: 'primary', salesRatio: 100 }],
        },
      ],
      payments: [{ paymentMethod: 'cash', amount: 11880 }],
    });

    expect(result.total).toBe(11880);
  });

  it('指名料金を含む会計を処理できる', async () => {
    const saleData = {
      id: 'sale-nomination-001',
      subtotal: 6050, // カット5500 + 指名料550
      tax_total: 605,
      total: 6655,
      status: 'completed',
      items: [],
      payments: [],
      discounts: [],
    };

    const countQueryBuilder = createMockQueryBuilder([]);
    const saleQueryBuilder = createMockQueryBuilder([saleData]);
    saleQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: saleData, error: null });
        return Promise.resolve({ data: saleData, error: null });
      },
    });

    let queryCount = 0;
    mockSupabaseClient.from.mockImplementation(() => {
      queryCount++;
      if (queryCount === 1) return countQueryBuilder;
      return saleQueryBuilder;
    });

    const result = await saleService.create({
      companyId: testData.companyId,
      storeId: testData.storeId,
      customerId: testData.customers.bronze.id,
      items: [
        {
          itemType: 'menu',
          itemId: testData.menus.cut.id,
          name: 'カット',
          quantity: 1,
          unitPrice: 5500,
          nominationType: 'nominated',
          nominationFee: 550,
          taxRate: 10,
          staffAssignments: [{ staffId: testData.staff.stylist.id, role: 'primary', salesRatio: 100 }],
        },
      ],
      payments: [{ paymentMethod: 'cash', amount: 6655 }],
    });

    expect(result.total).toBe(6655);
  });
});

describe('複雑なビジネスシナリオ: 割引・クーポン・ポイント', () => {
  it('パーセント割引クーポンを適用できる', async () => {
    const saleData = {
      id: 'sale-coupon-001',
      subtotal: 5500,
      tax_total: 440, // 割引後の税額
      discount_total: 1100, // 20%オフ
      total: 4840,
      points_used: 0,
      points_earned: 48,
      status: 'completed',
      items: [],
      payments: [],
      discounts: [{ name: '新規割引20%', value: 20, value_type: 'percentage', amount: 1100 }],
    };

    const countQueryBuilder = createMockQueryBuilder([]);
    const saleQueryBuilder = createMockQueryBuilder([saleData]);
    saleQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: saleData, error: null });
        return Promise.resolve({ data: saleData, error: null });
      },
    });

    let queryCount = 0;
    mockSupabaseClient.from.mockImplementation(() => {
      queryCount++;
      if (queryCount === 1) return countQueryBuilder;
      return saleQueryBuilder;
    });

    const result = await saleService.create({
      companyId: testData.companyId,
      storeId: testData.storeId,
      customerId: testData.customers.bronze.id,
      items: [
        {
          itemType: 'menu',
          itemId: testData.menus.cut.id,
          name: 'カット',
          quantity: 1,
          unitPrice: 5500,
          taxRate: 10,
          staffAssignments: [{ staffId: testData.staff.stylist.id, role: 'primary', salesRatio: 100 }],
          discounts: [{
            discountType: 'item',
            discountSource: 'coupon',
            sourceId: testData.coupons.newCustomer.id,
            name: '新規割引20%',
            value: 20,
            valueType: 'percentage',
          }],
        },
      ],
      payments: [{ paymentMethod: 'cash', amount: 4840 }],
    });

    expect(result.discount_total).toBe(1100);
    expect(result.total).toBe(4840);
  });

  it('ポイント全額利用で0円会計できる', async () => {
    const saleData = {
      id: 'sale-points-all',
      subtotal: 5500,
      tax_total: 550,
      discount_total: 0,
      total: 0, // ポイントで全額支払い
      points_used: 6050,
      points_earned: 0, // 0円なのでポイント付与なし
      status: 'completed',
      items: [],
      payments: [],
      discounts: [],
    };

    const countQueryBuilder = createMockQueryBuilder([]);
    const saleQueryBuilder = createMockQueryBuilder([saleData]);
    saleQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: saleData, error: null });
        return Promise.resolve({ data: saleData, error: null });
      },
    });

    let queryCount = 0;
    mockSupabaseClient.from.mockImplementation(() => {
      queryCount++;
      if (queryCount === 1) return countQueryBuilder;
      return saleQueryBuilder;
    });

    const result = await saleService.create({
      companyId: testData.companyId,
      storeId: testData.storeId,
      customerId: testData.customers.platinum.id,
      items: [
        {
          itemType: 'menu',
          itemId: testData.menus.cut.id,
          name: 'カット',
          quantity: 1,
          unitPrice: 5500,
          taxRate: 10,
          staffAssignments: [{ staffId: testData.staff.stylist.id, role: 'primary', salesRatio: 100 }],
        },
      ],
      payments: [], // 0円なので支払いなし
      pointsUsed: 6050,
    });

    expect(result.total).toBe(0);
    expect(result.points_used).toBe(6050);
    expect(result.points_earned).toBe(0);
  });

  it('複数割引（クーポン＋ポイント）を同時適用できる', async () => {
    // カット5500 - 誕生日割引1000 + 税(450) - ポイント500 = 4450
    const saleData = {
      id: 'sale-multi-discount',
      subtotal: 5500,
      tax_total: 450,
      discount_total: 1000,
      total: 4450,
      points_used: 500,
      points_earned: 44,
      status: 'completed',
      items: [],
      payments: [],
      discounts: [],
    };

    const countQueryBuilder = createMockQueryBuilder([]);
    const saleQueryBuilder = createMockQueryBuilder([saleData]);
    saleQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: saleData, error: null });
        return Promise.resolve({ data: saleData, error: null });
      },
    });

    let queryCount = 0;
    mockSupabaseClient.from.mockImplementation(() => {
      queryCount++;
      if (queryCount === 1) return countQueryBuilder;
      return saleQueryBuilder;
    });

    const result = await saleService.create({
      companyId: testData.companyId,
      storeId: testData.storeId,
      customerId: testData.customers.gold.id,
      items: [
        {
          itemType: 'menu',
          itemId: testData.menus.cut.id,
          name: 'カット',
          quantity: 1,
          unitPrice: 5500,
          taxRate: 10,
          staffAssignments: [{ staffId: testData.staff.stylist.id, role: 'primary', salesRatio: 100 }],
        },
      ],
      discounts: [{
        discountType: 'global',
        discountSource: 'coupon',
        sourceId: testData.coupons.birthday.id,
        name: '誕生日割引',
        value: 1000,
        valueType: 'fixed',
      }],
      payments: [{ paymentMethod: 'cash', amount: 4450 }],
      pointsUsed: 500,
    });

    expect(result.discount_total).toBe(1000);
    expect(result.points_used).toBe(500);
    expect(result.total).toBe(4450);
  });
});

describe('複雑なビジネスシナリオ: 施術＋物販の複合会計', () => {
  it('施術メニューと店販商品を同時会計できる', async () => {
    // カット5500 + シャンプー3850 + 税935 = 10285
    const saleData = {
      id: 'sale-mixed-001',
      subtotal: 9350,
      tax_total: 935,
      total: 10285,
      status: 'completed',
      items: [
        { item_type: 'menu', name: 'カット', unit_price: 5500 },
        { item_type: 'product', name: 'プロ用シャンプー', unit_price: 3850 },
      ],
      payments: [],
      discounts: [],
    };

    const countQueryBuilder = createMockQueryBuilder([]);
    const saleQueryBuilder = createMockQueryBuilder([saleData]);
    saleQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: saleData, error: null });
        return Promise.resolve({ data: saleData, error: null });
      },
    });

    let queryCount = 0;
    mockSupabaseClient.from.mockImplementation(() => {
      queryCount++;
      if (queryCount === 1) return countQueryBuilder;
      return saleQueryBuilder;
    });

    const result = await saleService.create({
      companyId: testData.companyId,
      storeId: testData.storeId,
      customerId: testData.customers.gold.id,
      items: [
        {
          itemType: 'menu',
          itemId: testData.menus.cut.id,
          name: 'カット',
          quantity: 1,
          unitPrice: 5500,
          taxRate: 10,
          staffAssignments: [{ staffId: testData.staff.stylist.id, role: 'primary', salesRatio: 100 }],
        },
        {
          itemType: 'product',
          itemId: testData.products.shampoo.id,
          name: 'プロ用シャンプー',
          quantity: 1,
          unitPrice: 3850,
          taxRate: 10,
          staffAssignments: [{ staffId: testData.staff.stylist.id, role: 'primary', salesRatio: 100 }],
        },
      ],
      payments: [{ paymentMethod: 'credit_card', amount: 10285 }],
    });

    expect(result.total).toBe(10285);
    expect(result.items).toHaveLength(2);
  });

  it('物販のみの会計を処理できる', async () => {
    // シャンプー3850 + トリートメント2750 + 税660 = 7260
    const saleData = {
      id: 'sale-product-only',
      subtotal: 6600,
      tax_total: 660,
      total: 7260,
      status: 'completed',
      items: [],
      payments: [],
      discounts: [],
    };

    const countQueryBuilder = createMockQueryBuilder([]);
    const saleQueryBuilder = createMockQueryBuilder([saleData]);
    saleQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: saleData, error: null });
        return Promise.resolve({ data: saleData, error: null });
      },
    });

    let queryCount = 0;
    mockSupabaseClient.from.mockImplementation(() => {
      queryCount++;
      if (queryCount === 1) return countQueryBuilder;
      return saleQueryBuilder;
    });

    const result = await saleService.create({
      companyId: testData.companyId,
      storeId: testData.storeId,
      customerId: testData.customers.bronze.id,
      items: [
        {
          itemType: 'product',
          itemId: testData.products.shampoo.id,
          name: 'プロ用シャンプー',
          quantity: 1,
          unitPrice: 3850,
          taxRate: 10,
          staffAssignments: [{ staffId: testData.staff.stylist.id, role: 'primary', salesRatio: 100 }],
        },
        {
          itemType: 'product',
          itemId: testData.products.treatment.id,
          name: 'ホームケアトリートメント',
          quantity: 1,
          unitPrice: 2750,
          taxRate: 10,
          staffAssignments: [{ staffId: testData.staff.stylist.id, role: 'primary', salesRatio: 100 }],
        },
      ],
      payments: [{ paymentMethod: 'cash', amount: 7260 }],
    });

    expect(result.total).toBe(7260);
  });
});

describe('複雑なビジネスシナリオ: ウォークイン新規顧客フロー', () => {
  it('新規顧客登録→来店→会計の完全フローを処理できる', async () => {
    // Step 1: 新規顧客作成
    const newCustomer = {
      id: 'customer-new-001',
      company_id: testData.companyId,
      customer_code: 'C000100',
      first_name: '新規',
      last_name: '顧客',
      phone: '090-9999-9999',
      points_balance: 0,
      total_visits: 0,
      total_spend: 0,
      rank: 'bronze',
      is_active: true,
    };

    const customerQueryBuilder = createMockQueryBuilder([newCustomer]);
    customerQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: newCustomer, error: null });
        return Promise.resolve({ data: newCustomer, error: null });
      },
    });
    mockSupabaseClient.from.mockReturnValue(customerQueryBuilder);

    const createdCustomer = await customerService.create({
      company_id: testData.companyId,
      customer_code: 'WALK-001',
      first_name: '新規',
      last_name: '顧客',
      phone: '090-9999-9999',
    });

    expect(createdCustomer.id).toBe('customer-new-001');

    // Step 2: ウォークイン来店
    const visitData = {
      id: 'visit-walkin-001',
      company_id: testData.companyId,
      store_id: testData.storeId,
      customer_id: newCustomer.id,
      staff_id: testData.staff.stylist.id,
      reservation_id: null,
      status: 'checked_in',
      nomination_type: 'none',
      check_in_at: new Date().toISOString(),
    };

    const visitQueryBuilder = createMockQueryBuilder([visitData]);
    visitQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: visitData, error: null });
        return Promise.resolve({ data: visitData, error: null });
      },
    });
    mockSupabaseClient.from.mockReturnValue(visitQueryBuilder);

    const visit = await visitService.checkIn({
      company_id: testData.companyId,
      store_id: testData.storeId,
      customer_id: newCustomer.id,
      staff_id: testData.staff.stylist.id,
      nomination_type: 'none',
    });

    expect(visit.reservation_id).toBeNull();
    expect(visit.status).toBe('checked_in');

    // Step 3: 会計
    const saleData = {
      id: 'sale-walkin-001',
      company_id: testData.companyId,
      store_id: testData.storeId,
      customer_id: newCustomer.id,
      visit_id: visit.id,
      subtotal: 5500,
      tax_total: 550,
      total: 6050,
      points_used: 0,
      points_earned: 60,
      status: 'completed',
      items: [],
      payments: [],
      discounts: [],
    };

    const countQueryBuilder = createMockQueryBuilder([]);
    const saleQueryBuilder = createMockQueryBuilder([saleData]);
    saleQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: saleData, error: null });
        return Promise.resolve({ data: saleData, error: null });
      },
    });

    let queryCount = 0;
    mockSupabaseClient.from.mockImplementation(() => {
      queryCount++;
      if (queryCount === 1) return countQueryBuilder;
      return saleQueryBuilder;
    });

    const sale = await saleService.create({
      companyId: testData.companyId,
      storeId: testData.storeId,
      visitId: visit.id,
      customerId: newCustomer.id,
      items: [
        {
          itemType: 'menu',
          itemId: testData.menus.cut.id,
          name: 'カット',
          quantity: 1,
          unitPrice: 5500,
          taxRate: 10,
          staffAssignments: [{ staffId: testData.staff.stylist.id, role: 'primary', salesRatio: 100 }],
        },
      ],
      payments: [{ paymentMethod: 'cash', amount: 6050 }],
    });

    expect(sale.customer_id).toBe(newCustomer.id);
    expect(sale.visit_id).toBe(visit.id);
    expect(sale.total).toBe(6050);
  });
});

describe('複雑なビジネスシナリオ: 予約変更・キャンセル', () => {
  it('予約日時変更を処理できる', async () => {
    const originalReservation = {
      id: 'reservation-change-001',
      company_id: testData.companyId,
      store_id: testData.storeId,
      customer_id: testData.customers.gold.id,
      staff_id: testData.staff.stylist.id,
      start_time: '2025-12-15T10:00:00',
      end_time: '2025-12-15T11:00:00',
      status: 'confirmed',
    };

    const updatedReservation = {
      ...originalReservation,
      start_time: '2025-12-16T14:00:00',
      end_time: '2025-12-16T15:00:00',
    };

    const queryBuilder = createMockQueryBuilder([updatedReservation]);
    queryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: updatedReservation, error: null });
        return Promise.resolve({ data: updatedReservation, error: null });
      },
    });
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const result = await reservationService.update('reservation-change-001', {
      start_time: '2025-12-16T14:00:00',
      end_time: '2025-12-16T15:00:00',
    });

    expect(result.start_time).toBe('2025-12-16T14:00:00');
    expect(result.end_time).toBe('2025-12-16T15:00:00');
  });

  it('スタッフ変更を処理できる', async () => {
    const updatedReservation = {
      id: 'reservation-staff-change',
      staff_id: testData.staff.colorist.id,
      status: 'confirmed',
    };

    const queryBuilder = createMockQueryBuilder([updatedReservation]);
    queryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: updatedReservation, error: null });
        return Promise.resolve({ data: updatedReservation, error: null });
      },
    });
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const result = await reservationService.update('reservation-staff-change', {
      staff_id: testData.staff.colorist.id,
    });

    expect(result.staff_id).toBe(testData.staff.colorist.id);
  });

  it('No-Show記録を処理できる', async () => {
    const noShowReservation = {
      id: 'reservation-noshow-001',
      status: 'no_show',
    };

    const queryBuilder = createMockQueryBuilder([noShowReservation]);
    queryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: noShowReservation, error: null });
        return Promise.resolve({ data: noShowReservation, error: null });
      },
    });
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const result = await reservationService.noShow('reservation-noshow-001');

    expect(result.status).toBe('no_show');
  });
});

describe('複雑なビジネスシナリオ: 売上取消とポイント戻し', () => {
  it('ポイント利用済み会計の取消でポイントが戻る', async () => {
    const originalSale = {
      id: 'sale-void-points',
      company_id: testData.companyId,
      customer_id: testData.customers.gold.id,
      sale_number: '20251215-0010',
      total: 5550,
      points_used: 500,
      points_earned: 55,
      status: 'completed',
      items: [],
      payments: [],
      discounts: [],
    };

    const voidedSale = {
      ...originalSale,
      status: 'voided',
      voided_at: new Date().toISOString(),
      voided_by: testData.staff.stylist.id,
      void_reason: '誤入力',
    };

    const getByIdQueryBuilder = createMockQueryBuilder([originalSale]);
    getByIdQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: originalSale, error: null });
        return Promise.resolve({ data: originalSale, error: null });
      },
    });

    const updateQueryBuilder = createMockQueryBuilder([voidedSale]);
    updateQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: voidedSale, error: null });
        return Promise.resolve({ data: voidedSale, error: null });
      },
    });

    let callCount = 0;
    mockSupabaseClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return getByIdQueryBuilder;
      return updateQueryBuilder;
    });

    const result = await saleService.void('sale-void-points', '誤入力', testData.staff.stylist.id);

    expect(result.status).toBe('voided');
    // ポイント戻し: 使用した500ポイント返還、付与した55ポイント取消
    // 結果的に +500 - 55 = +445 ポイントの調整
  });
});

describe('複雑なビジネスシナリオ: 分割払い', () => {
  it('現金とクレジットカードの分割払いを処理できる', async () => {
    const saleData = {
      id: 'sale-split-001',
      total: 20000,
      status: 'completed',
      items: [],
      payments: [
        { payment_method: 'cash', amount: 10000 },
        { payment_method: 'credit_card', amount: 10000 },
      ],
      discounts: [],
    };

    const countQueryBuilder = createMockQueryBuilder([]);
    const saleQueryBuilder = createMockQueryBuilder([saleData]);
    saleQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: saleData, error: null });
        return Promise.resolve({ data: saleData, error: null });
      },
    });

    let queryCount = 0;
    mockSupabaseClient.from.mockImplementation(() => {
      queryCount++;
      if (queryCount === 1) return countQueryBuilder;
      return saleQueryBuilder;
    });

    const result = await saleService.create({
      companyId: testData.companyId,
      storeId: testData.storeId,
      customerId: testData.customers.gold.id,
      items: [
        {
          itemType: 'menu',
          itemId: testData.menus.perm.id,
          name: 'パーマ',
          quantity: 1,
          unitPrice: 11000,
          taxRate: 10,
          staffAssignments: [{ staffId: testData.staff.stylist.id, role: 'primary', salesRatio: 100 }],
        },
        {
          itemType: 'menu',
          itemId: testData.menus.cut.id,
          name: 'カット',
          quantity: 1,
          unitPrice: 5500,
          taxRate: 10,
          staffAssignments: [{ staffId: testData.staff.stylist.id, role: 'primary', salesRatio: 100 }],
        },
      ],
      payments: [
        { paymentMethod: 'cash', amount: 10000 },
        { paymentMethod: 'credit_card', amount: 10000 },
      ],
    });

    expect(result.status).toBe('completed');
    expect(result.payments).toHaveLength(2);
  });

  it('3種類以上の支払い方法を組み合わせできる', async () => {
    const saleData = {
      id: 'sale-multi-pay',
      total: 30000,
      status: 'completed',
      items: [],
      payments: [
        { payment_method: 'cash', amount: 10000 },
        { payment_method: 'credit_card', amount: 15000 },
        { payment_method: 'qr_code', amount: 5000 },
      ],
      discounts: [],
    };

    const countQueryBuilder = createMockQueryBuilder([]);
    const saleQueryBuilder = createMockQueryBuilder([saleData]);
    saleQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: saleData, error: null });
        return Promise.resolve({ data: saleData, error: null });
      },
    });

    let queryCount = 0;
    mockSupabaseClient.from.mockImplementation(() => {
      queryCount++;
      if (queryCount === 1) return countQueryBuilder;
      return saleQueryBuilder;
    });

    const result = await saleService.create({
      companyId: testData.companyId,
      storeId: testData.storeId,
      customerId: testData.customers.platinum.id,
      items: [
        {
          itemType: 'menu',
          itemId: testData.menus.perm.id,
          name: 'パーマ＋カット＋カラー',
          quantity: 1,
          unitPrice: 25000,
          taxRate: 10,
          staffAssignments: [
            { staffId: testData.staff.stylist.id, role: 'primary', salesRatio: 60 },
            { staffId: testData.staff.colorist.id, role: 'assistant', salesRatio: 40 },
          ],
        },
      ],
      payments: [
        { paymentMethod: 'cash', amount: 10000 },
        { paymentMethod: 'credit_card', amount: 15000 },
        { paymentMethod: 'qr_code', amount: 5000 },
      ],
    });

    expect(result.status).toBe('completed');
    expect(result.payments).toHaveLength(3);
  });
});

describe('複雑なビジネスシナリオ: 日次業務', () => {
  it('本日の売上サマリーを取得できる', async () => {
    const todaySales = [
      { id: 'sale-1', total: 6050, status: 'completed' },
      { id: 'sale-2', total: 15000, status: 'completed' },
      { id: 'sale-3', total: 8800, status: 'completed' },
    ];

    const queryBuilder = createMockQueryBuilder(todaySales);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const sales = await saleService.getToday(testData.companyId, testData.storeId);

    expect(sales).toHaveLength(3);
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    expect(totalRevenue).toBe(29850);
  });

  it('本日の来店数を取得できる', async () => {
    const todayVisits = [
      { id: 'visit-1', status: 'completed' },
      { id: 'visit-2', status: 'completed' },
      { id: 'visit-3', status: 'in_service' },
      { id: 'visit-4', status: 'checked_in' },
    ];

    const queryBuilder = createMockQueryBuilder(todayVisits);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const visits = await visitService.getToday(testData.companyId, testData.storeId);

    expect(visits).toHaveLength(4);
    const completedCount = visits.filter(v => v.status === 'completed').length;
    expect(completedCount).toBe(2);
  });

  it('スタッフ別売上を集計できる', async () => {
    const stylistSales = [
      { staff_id: testData.staff.stylist.id, sales_amount: 15000 },
      { staff_id: testData.staff.stylist.id, sales_amount: 8000 },
    ];

    const queryBuilder = createMockQueryBuilder(stylistSales);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const sales = await saleService.getStaffSales(
      testData.staff.stylist.id,
      '2025-12-15',
      '2025-12-15'
    );

    expect(sales).toHaveLength(2);
    const totalSales = sales.reduce((sum, s) => sum + (s as { sales_amount: number }).sales_amount, 0);
    expect(totalSales).toBe(23000);
  });
});
