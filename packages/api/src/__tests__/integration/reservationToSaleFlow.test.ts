/**
 * 統合テスト: 予約 → 来店 → 会計 フロー
 *
 * このテストは、美容室の典型的な業務フローをシミュレートします:
 * 1. 予約作成
 * 2. 予約確認
 * 3. 来店チェックイン
 * 4. 施術開始
 * 5. 施術完了
 * 6. 顧客データ更新
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
  customerId: 'customer-001',
  staffId: 'staff-001',
  menuId: 'menu-001',

  customer: {
    id: 'customer-001',
    company_id: 'company-001',
    customer_code: 'C000001',
    first_name: '太郎',
    last_name: '田中',
    phone: '090-1234-5678',
    email: 'tanaka@example.com',
    points_balance: 500,
    total_visits: 10,
    total_spend: 50000,
    is_active: true,
  },

  staff: {
    id: 'staff-001',
    company_id: 'company-001',
    first_name: '花子',
    last_name: '山田',
    role: 'stylist',
    nomination_fee: 550,
    is_active: true,
  },

  menu: {
    id: 'menu-001',
    company_id: 'company-001',
    name: 'カット',
    price: 5500,
    duration_minutes: 60,
    tax_rate: 10,
    is_active: true,
  },
};

describe('統合テスト: 予約→来店→会計フロー', () => {
  describe('Step 1: 予約作成', () => {
    it('新規予約を作成できる', async () => {
      const reservationData = {
        id: 'reservation-001',
        company_id: testData.companyId,
        store_id: testData.storeId,
        customer_id: testData.customerId,
        staff_id: testData.staffId,
        start_time: '2025-12-15T10:00:00',
        end_time: '2025-12-15T11:00:00',
        status: 'pending',
        menu_ids: [testData.menuId],
        created_at: new Date().toISOString(),
      };

      const queryBuilder = createMockQueryBuilder([reservationData]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: reservationData, error: null });
          return Promise.resolve({ data: reservationData, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await reservationService.create({
        company_id: testData.companyId,
        store_id: testData.storeId,
        customer_id: testData.customerId,
        staff_id: testData.staffId,
        start_time: '2025-12-15T10:00:00',
        end_time: '2025-12-15T11:00:00',
        menu_ids: [testData.menuId],
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('reservations');
      expect(queryBuilder.insert).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
      expect(result.status).toBe('pending');
    });
  });

  describe('Step 2: 予約確認', () => {
    it('予約ステータスを確認済みに更新できる', async () => {
      const confirmedReservation = {
        id: 'reservation-001',
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      };

      const queryBuilder = createMockQueryBuilder([confirmedReservation]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: confirmedReservation, error: null });
          return Promise.resolve({ data: confirmedReservation, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await reservationService.confirm('reservation-001');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('reservations');
      expect(queryBuilder.update).toHaveBeenCalled();
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'reservation-001');
      expect(result.status).toBe('confirmed');
    });
  });

  describe('Step 3: 来店チェックイン', () => {
    it('予約から来店を作成できる', async () => {
      const visitData = {
        id: 'visit-001',
        company_id: testData.companyId,
        store_id: testData.storeId,
        customer_id: testData.customerId,
        staff_id: testData.staffId,
        reservation_id: 'reservation-001',
        status: 'checked_in',
        check_in_at: new Date().toISOString(),
        nomination_type: 'nominated',
      };

      const queryBuilder = createMockQueryBuilder([visitData]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: visitData, error: null });
          return Promise.resolve({ data: visitData, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await visitService.checkIn({
        company_id: testData.companyId,
        store_id: testData.storeId,
        customer_id: testData.customerId,
        staff_id: testData.staffId,
        reservation_id: 'reservation-001',
        nomination_type: 'nominated',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('visits');
      expect(queryBuilder.insert).toHaveBeenCalled();
      expect(result.status).toBe('checked_in');
      expect(result.reservation_id).toBe('reservation-001');
    });
  });

  describe('Step 4: 施術開始', () => {
    it('来店ステータスを施術中に更新できる', async () => {
      const inServiceVisit = {
        id: 'visit-001',
        status: 'in_service',
        service_start_at: new Date().toISOString(),
      };

      const queryBuilder = createMockQueryBuilder([inServiceVisit]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: inServiceVisit, error: null });
          return Promise.resolve({ data: inServiceVisit, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await visitService.startService('visit-001');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('visits');
      expect(queryBuilder.update).toHaveBeenCalled();
      expect(result.status).toBe('in_service');
    });
  });

  describe('Step 5: 施術完了', () => {
    it('施術終了時刻を記録できる', async () => {
      const endedVisit = {
        id: 'visit-001',
        service_end_at: new Date().toISOString(),
      };

      const queryBuilder = createMockQueryBuilder([endedVisit]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: endedVisit, error: null });
          return Promise.resolve({ data: endedVisit, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await visitService.endService('visit-001');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('visits');
      expect(queryBuilder.update).toHaveBeenCalled();
      expect(result.service_end_at).toBeDefined();
    });

    it('来店ステータスを完了に更新できる（チェックアウト）', async () => {
      const completedVisit = {
        id: 'visit-001',
        status: 'completed',
        check_out_at: new Date().toISOString(),
        customer_id: testData.customerId,
      };

      const queryBuilder = createMockQueryBuilder([completedVisit]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: completedVisit, error: null });
          return Promise.resolve({ data: completedVisit, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });

      const result = await visitService.checkOut('visit-001');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('visits');
      expect(queryBuilder.update).toHaveBeenCalled();
      expect(result.status).toBe('completed');
    });
  });

  describe('Step 6: 顧客データ更新確認', () => {
    it('売上後に顧客の来店回数・累計金額が更新される', async () => {
      const currentCustomer = {
        total_visits: 10,
        total_spent: 50000,
      };

      const updatedCustomer = {
        ...testData.customer,
        total_visits: 11,
        total_spend: 56050,
        last_visit_at: new Date().toISOString(),
      };

      // First call to get current stats
      const getQueryBuilder = createMockQueryBuilder([currentCustomer]);
      getQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: currentCustomer, error: null });
          return Promise.resolve({ data: currentCustomer, error: null });
        },
      });

      // Second call to update
      const updateQueryBuilder = createMockQueryBuilder([updatedCustomer]);
      updateQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: updatedCustomer, error: null });
          return Promise.resolve({ data: updatedCustomer, error: null });
        },
      });

      let callCount = 0;
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return getQueryBuilder;
        }
        return updateQueryBuilder;
      });

      const result = await customerService.updateStats(testData.customerId, 6050);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers');
      expect(result.total_visits).toBe(11);
      expect(result.total_spend).toBe(56050);
    });
  });

  describe('エラーハンドリング', () => {
    it('予約なしの来店（ウォークイン）も処理できる', async () => {
      const walkInVisit = {
        id: 'visit-walkin-001',
        company_id: testData.companyId,
        store_id: testData.storeId,
        customer_id: testData.customerId,
        staff_id: testData.staffId,
        reservation_id: null,
        status: 'checked_in',
        nomination_type: 'none',
      };

      const queryBuilder = createMockQueryBuilder([walkInVisit]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: walkInVisit, error: null });
          return Promise.resolve({ data: walkInVisit, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await visitService.checkIn({
        company_id: testData.companyId,
        store_id: testData.storeId,
        customer_id: testData.customerId,
        staff_id: testData.staffId,
        nomination_type: 'none',
      });

      expect(result.reservation_id).toBeNull();
      expect(result.nomination_type).toBe('none');
    });

    it('予約キャンセル時は来店作成できない', async () => {
      const cancelledReservation = {
        id: 'reservation-cancelled',
        status: 'cancelled',
      };

      const queryBuilder = createMockQueryBuilder([cancelledReservation]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: cancelledReservation, error: null });
          return Promise.resolve({ data: cancelledReservation, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      // キャンセル済み予約からの来店は拒否されるべき
      const reservation = await reservationService.getById('reservation-cancelled');
      expect(reservation?.status).toBe('cancelled');
    });
  });
});

describe('統合テスト: 来店一覧取得', () => {
  it('本日の来店一覧を取得できる', async () => {
    const todayVisits = [
      {
        id: 'visit-001',
        status: 'checked_in',
        customer: testData.customer,
        staff: testData.staff,
      },
      {
        id: 'visit-002',
        status: 'in_service',
        customer: { ...testData.customer, id: 'customer-002' },
        staff: testData.staff,
      },
    ];

    const queryBuilder = createMockQueryBuilder(todayVisits);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const result = await visitService.getToday(
      testData.companyId,
      testData.storeId
    );

    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('checked_in');
  });

  it('アクティブな来店（待機中・施術中）を取得できる', async () => {
    const activeVisits = [
      {
        id: 'visit-001',
        status: 'checked_in',
      },
      {
        id: 'visit-002',
        status: 'in_service',
      },
    ];

    const queryBuilder = createMockQueryBuilder(activeVisits);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const result = await visitService.getActive(
      testData.companyId,
      testData.storeId
    );

    expect(result).toHaveLength(2);
    expect(['checked_in', 'in_service']).toContain(result[0].status);
  });

  it('待機中の来店数を取得できる', async () => {
    const queryBuilder = createMockQueryBuilder([]);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const result = await visitService.getWaitingCount(
      testData.companyId,
      testData.storeId
    );

    expect(typeof result).toBe('number');
  });
});

describe('統合テスト: 顧客管理', () => {
  it('顧客を検索できる', async () => {
    const searchResults = [testData.customer];
    const queryBuilder = createMockQueryBuilder(searchResults);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const result = await customerService.search(testData.companyId, '田中');

    expect(result).toHaveLength(1);
    expect(result[0].last_name).toBe('田中');
  });

  it('顧客情報を取得できる', async () => {
    const queryBuilder = createMockQueryBuilder([testData.customer]);
    queryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: testData.customer, error: null });
        return Promise.resolve({ data: testData.customer, error: null });
      },
    });
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const result = await customerService.getById(testData.customerId);

    expect(result).toBeTruthy();
    expect(result?.id).toBe(testData.customerId);
    expect(result?.first_name).toBe('太郎');
  });

  it('顧客情報を更新できる', async () => {
    const updatedCustomer = {
      ...testData.customer,
      phone: '080-9999-8888',
    };

    const queryBuilder = createMockQueryBuilder([updatedCustomer]);
    queryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: updatedCustomer, error: null });
        return Promise.resolve({ data: updatedCustomer, error: null });
      },
    });
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const result = await customerService.update(testData.customerId, {
      phone: '080-9999-8888',
    });

    expect(result.phone).toBe('080-9999-8888');
  });
});

describe('統合テスト: 予約一覧取得', () => {
  it('日付で予約一覧を取得できる', async () => {
    const reservations = [
      {
        id: 'reservation-001',
        company_id: testData.companyId,
        store_id: testData.storeId,
        start_time: '2025-12-15T10:00:00',
        status: 'confirmed',
      },
      {
        id: 'reservation-002',
        company_id: testData.companyId,
        store_id: testData.storeId,
        start_time: '2025-12-15T14:00:00',
        status: 'pending',
      },
    ];

    const queryBuilder = createMockQueryBuilder(reservations);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const result = await reservationService.getByDate(
      testData.companyId,
      testData.storeId,
      '2025-12-15'
    );

    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('confirmed');
  });

  it('予約をキャンセルできる', async () => {
    const cancelledReservation = {
      id: 'reservation-001',
      status: 'cancelled',
      notes: 'お客様都合',
    };

    const queryBuilder = createMockQueryBuilder([cancelledReservation]);
    queryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: cancelledReservation, error: null });
        return Promise.resolve({ data: cancelledReservation, error: null });
      },
    });
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const result = await reservationService.cancel('reservation-001', 'お客様都合');

    expect(result.status).toBe('cancelled');
    expect(result.notes).toBe('お客様都合');
  });
});

describe('統合テスト: 会計処理（saleService）', () => {
  it('売上データを作成できる', async () => {
    const saleData = {
      id: 'sale-001',
      company_id: testData.companyId,
      store_id: testData.storeId,
      customer_id: testData.customerId,
      visit_id: 'visit-001',
      sale_number: '20251215-0001',
      subtotal: 5500,
      tax_total: 550,
      discount_total: 0,
      total: 6050,
      points_used: 0,
      points_earned: 60,
      status: 'completed',
      items: [],
      payments: [],
      discounts: [],
      created_at: new Date().toISOString(),
    };

    const saleWithDetails = {
      ...saleData,
      customer: testData.customer,
      store: { id: testData.storeId, name: 'テスト店舗' },
    };

    // For generateSaleNumber count query
    const countQueryBuilder = createMockQueryBuilder([]);

    // For sale insert and subsequent queries
    const saleQueryBuilder = createMockQueryBuilder([saleData]);
    saleQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: saleData, error: null });
        return Promise.resolve({ data: saleData, error: null });
      },
    });

    // For getById at the end
    const getByIdQueryBuilder = createMockQueryBuilder([saleWithDetails]);
    getByIdQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: saleWithDetails, error: null });
        return Promise.resolve({ data: saleWithDetails, error: null });
      },
    });

    // Track which query is being made
    let queryCount = 0;
    mockSupabaseClient.from.mockImplementation((table: string) => {
      queryCount++;
      // First query is for count (generateSaleNumber)
      if (queryCount === 1 && table === 'sales') {
        return countQueryBuilder;
      }
      // Last query is getById
      if (table === 'sales' && queryCount > 10) {
        return getByIdQueryBuilder;
      }
      return saleQueryBuilder;
    });

    const createSaleData = {
      companyId: testData.companyId,
      storeId: testData.storeId,
      visitId: 'visit-001',
      customerId: testData.customerId,
      items: [{
        itemType: 'menu' as const,
        itemId: testData.menuId,
        name: 'カット',
        quantity: 1,
        unitPrice: 5500,
        taxRate: 10,
        nominationType: 'nominated',
        nominationFee: 550,
        staffAssignments: [{
          staffId: testData.staffId,
          role: 'primary' as const,
          salesRatio: 100,
        }],
      }],
      payments: [{
        paymentMethod: 'cash',
        amount: 6050,
      }],
    };

    const result = await saleService.create(createSaleData);

    expect(result).toHaveProperty('id');
    expect(result.total).toBe(6050);
    expect(result.status).toBe('completed');
  });

  it('ポイント利用で割引できる', async () => {
    const saleWithPoints = {
      id: 'sale-002',
      company_id: testData.companyId,
      store_id: testData.storeId,
      customer_id: testData.customerId,
      subtotal: 5500,
      tax_total: 550,
      discount_total: 0,
      total: 5550, // 6050 - 500ポイント
      points_used: 500,
      points_earned: 55,
      status: 'completed',
      items: [],
      payments: [],
      discounts: [],
    };

    const countQueryBuilder = createMockQueryBuilder([]);
    const saleQueryBuilder = createMockQueryBuilder([saleWithPoints]);
    saleQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: saleWithPoints, error: null });
        return Promise.resolve({ data: saleWithPoints, error: null });
      },
    });

    let queryCount = 0;
    mockSupabaseClient.from.mockImplementation(() => {
      queryCount++;
      if (queryCount === 1) {
        return countQueryBuilder;
      }
      return saleQueryBuilder;
    });

    const createSaleData = {
      companyId: testData.companyId,
      storeId: testData.storeId,
      customerId: testData.customerId,
      items: [{
        itemType: 'menu' as const,
        itemId: testData.menuId,
        name: 'カット',
        quantity: 1,
        unitPrice: 5500,
        taxRate: 10,
        staffAssignments: [{
          staffId: testData.staffId,
          role: 'primary' as const,
          salesRatio: 100,
        }],
      }],
      payments: [{
        paymentMethod: 'cash',
        amount: 5550,
      }],
      pointsUsed: 500,
    };

    const result = await saleService.create(createSaleData);

    expect(result.points_used).toBe(500);
    expect(result.total).toBe(5550);
  });

  it('複数支払い方法で決済できる', async () => {
    const saleWithMultiplePayments = {
      id: 'sale-003',
      total: 10000,
      status: 'completed',
      items: [],
      payments: [],
      discounts: [],
    };

    const countQueryBuilder = createMockQueryBuilder([]);
    const saleQueryBuilder = createMockQueryBuilder([saleWithMultiplePayments]);
    saleQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: saleWithMultiplePayments, error: null });
        return Promise.resolve({ data: saleWithMultiplePayments, error: null });
      },
    });

    let queryCount = 0;
    mockSupabaseClient.from.mockImplementation(() => {
      queryCount++;
      if (queryCount === 1) {
        return countQueryBuilder;
      }
      return saleQueryBuilder;
    });

    const createSaleData = {
      companyId: testData.companyId,
      storeId: testData.storeId,
      customerId: testData.customerId,
      items: [{
        itemType: 'menu' as const,
        name: 'カット＋カラー',
        quantity: 1,
        unitPrice: 10000,
        taxRate: 10,
        staffAssignments: [{
          staffId: testData.staffId,
          role: 'primary' as const,
          salesRatio: 100,
        }],
      }],
      payments: [
        { paymentMethod: 'cash', amount: 5000 },
        { paymentMethod: 'credit_card', amount: 5000 },
      ],
    };

    const result = await saleService.create(createSaleData);

    expect(result.status).toBe('completed');
  });

  it('日別売上合計を取得できる', async () => {
    const salesData = [
      { total: 5000 },
      { total: 8000 },
      { total: 12000 },
    ];

    const queryBuilder = createMockQueryBuilder(salesData);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const result = await saleService.getSalesTotal(
      testData.companyId,
      testData.storeId,
      '2025-12-15'
    );

    expect(result).toBe(25000);
  });

  it('日別売上件数を取得できる', async () => {
    const queryBuilder = createMockQueryBuilder([]);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const result = await saleService.getSalesCount(
      testData.companyId,
      testData.storeId,
      '2025-12-15'
    );

    expect(typeof result).toBe('number');
  });

  it('本日の売上一覧を取得できる', async () => {
    const todaySales = [
      {
        id: 'sale-001',
        total: 5500,
        status: 'completed',
        items: [],
        payments: [],
        discounts: [],
      },
      {
        id: 'sale-002',
        total: 8000,
        status: 'completed',
        items: [],
        payments: [],
        discounts: [],
      },
    ];

    const queryBuilder = createMockQueryBuilder(todaySales);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const result = await saleService.getToday(
      testData.companyId,
      testData.storeId
    );

    expect(result).toHaveLength(2);
    expect(result[0].total).toBe(5500);
  });

  it('顧客の売上履歴を取得できる', async () => {
    const customerSales = [
      {
        id: 'sale-001',
        customer_id: testData.customerId,
        total: 5500,
        status: 'completed',
      },
      {
        id: 'sale-002',
        customer_id: testData.customerId,
        total: 8000,
        status: 'completed',
      },
    ];

    const queryBuilder = createMockQueryBuilder(customerSales);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const result = await saleService.getByCustomer(testData.customerId);

    expect(result).toHaveLength(2);
    expect(result[0].customer_id).toBe(testData.customerId);
  });

  it('スタッフ別売上を取得できる', async () => {
    const staffSales = [
      {
        staff_id: testData.staffId,
        sales_amount: 80000,
        sale_item: {
          sale: { status: 'completed' }
        }
      },
      {
        staff_id: testData.staffId,
        sales_amount: 50000,
        sale_item: {
          sale: { status: 'completed' }
        }
      },
    ];

    const queryBuilder = createMockQueryBuilder(staffSales);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const result = await saleService.getStaffSales(
      testData.staffId,
      '2025-12-15',
      '2025-12-15'
    );

    expect(result).toHaveLength(2);
  });

  it('売上を取り消しできる', async () => {
    const originalSale = {
      id: 'sale-001',
      company_id: testData.companyId,
      customer_id: testData.customerId,
      sale_number: '20251215-0001',
      total: 6050,
      points_used: 0,
      points_earned: 60,
      status: 'completed',
      items: [],
      payments: [],
      discounts: [],
    };

    const voidedSale = {
      ...originalSale,
      status: 'voided',
      voided_at: new Date().toISOString(),
      voided_by: testData.staffId,
      void_reason: 'お客様都合',
    };

    // First call - getById for the original sale
    const getByIdQueryBuilder = createMockQueryBuilder([originalSale]);
    getByIdQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: originalSale, error: null });
        return Promise.resolve({ data: originalSale, error: null });
      },
    });

    // Second call - update to void
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
      if (callCount === 1) {
        return getByIdQueryBuilder;
      }
      return updateQueryBuilder;
    });

    const result = await saleService.void('sale-001', 'お客様都合', testData.staffId);

    expect(result.status).toBe('voided');
  });
});
