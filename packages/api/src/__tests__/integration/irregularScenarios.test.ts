/**
 * イレギュラーシナリオの統合テスト
 * - 赤伝（売上取消）
 * - キャンセル料計算
 * - ノーショー処理
 * - ブラックリスト管理
 * - エラーリカバリー
 */

import { saleService } from '../../services/saleService';
import { cancellationService } from '../../services/cancellationService';
import { visitService } from '../../services/visitService';
import { reservationService } from '../../services/reservationService';
import { getSupabaseClient, resetSupabaseClient } from '../../client';
import { createMockQueryBuilder } from '../setup';

// Mock Supabase client
jest.mock('../../client', () => ({
  getSupabaseClient: jest.fn(),
  resetSupabaseClient: jest.fn(),
}));

const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn(),
};

// Test data
const testData = {
  companyId: 'company-001',
  storeId: 'store-001',
  staffId: 'staff-001',
  customerId: 'customer-001',
  reservationId: 'reservation-001',
  visitId: 'visit-001',
  saleId: 'sale-001',
};

describe('イレギュラーシナリオ: 赤伝（売上取消）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('saleService.void メソッドが存在する', () => {
    expect(typeof saleService.void).toBe('function');
  });

  it('saleService.getVoidedSales メソッドが存在する', () => {
    expect(typeof saleService.getVoidedSales).toBe('function');
  });

  it('取り消し済み売上の一覧を取得できる', async () => {
    const voidedSales = [
      {
        id: 'sale-void-001',
        sale_number: 'SALE-V001',
        status: 'voided',
        total_amount: 5000,
        voided_at: '2024-01-15T10:00:00Z',
        void_reason: 'お客様都合',
      },
      {
        id: 'sale-void-002',
        sale_number: 'SALE-V002',
        status: 'voided',
        total_amount: 8000,
        voided_at: '2024-01-15T14:00:00Z',
        void_reason: '商品不良',
      },
    ];

    const queryBuilder = createMockQueryBuilder(voidedSales);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const result = await saleService.getVoidedSales(testData.storeId, '2024-01-15', '2024-01-15');

    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('voided');
    expect(result[1].status).toBe('voided');
  });
});

describe('イレギュラーシナリオ: キャンセル料計算', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('cancellationService.calculateFee メソッドが存在する', () => {
    expect(typeof cancellationService.calculateFee).toBe('function');
  });

  it('デフォルトポリシーを使用してキャンセル料を計算する', () => {
    const policy = cancellationService.getDefaultPolicy(testData.companyId);

    expect(policy.noShowFeePercentage).toBe(100);
    expect(policy.maxNoShowsBeforeBlacklist).toBe(3);
    expect(policy.rules).toHaveLength(3);

    // 24時間以内は50%
    const rule24h = policy.rules.find(r => r.hoursBeforeAppointment === 24);
    expect(rule24h?.feePercentage).toBe(50);

    // 48時間以内は30%
    const rule48h = policy.rules.find(r => r.hoursBeforeAppointment === 48);
    expect(rule48h?.feePercentage).toBe(30);
  });
});

describe('イレギュラーシナリオ: ブラックリスト管理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('顧客をブラックリストに追加できる', async () => {
    const updateQueryBuilder = createMockQueryBuilder([]);
    const insertQueryBuilder = createMockQueryBuilder([]);

    mockSupabaseClient.from
      .mockReturnValueOnce(updateQueryBuilder)
      .mockReturnValueOnce(insertQueryBuilder);

    await expect(
      cancellationService.blacklistCustomer(testData.companyId, testData.customerId, 'no_show_limit')
    ).resolves.not.toThrow();

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_logs');
  });

  it('顧客をブラックリストから削除できる', async () => {
    const queryBuilder = createMockQueryBuilder([]);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    await expect(
      cancellationService.removeFromBlacklist(testData.companyId, testData.customerId)
    ).resolves.not.toThrow();

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers');
  });
});

describe('イレギュラーシナリオ: 顧客キャンセル履歴', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('顧客のキャンセル履歴を取得できる', async () => {
    const cancellationRecords = [
      {
        id: 'cancel-001',
        customer_id: testData.customerId,
        cancellation_type: 'cancelled',
        fee_amount: 5000,
        rule_applied: '24時間以内のキャンセル',
        created_at: '2024-01-15T10:00:00Z',
      },
      {
        id: 'cancel-002',
        customer_id: testData.customerId,
        cancellation_type: 'no_show',
        fee_amount: 10000,
        rule_applied: '無断キャンセル',
        created_at: '2024-01-10T10:00:00Z',
      },
    ];

    const customer = { is_blacklisted: false };

    const recordsQueryBuilder = createMockQueryBuilder(cancellationRecords);
    const customerQueryBuilder = createMockQueryBuilder([customer]);
    customerQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: customer, error: null });
        return Promise.resolve({ data: customer, error: null });
      },
    });

    mockSupabaseClient.from
      .mockReturnValueOnce(recordsQueryBuilder)
      .mockReturnValueOnce(customerQueryBuilder);

    const history = await cancellationService.getCustomerHistory(testData.companyId, testData.customerId);

    expect(history.customerId).toBe(testData.customerId);
    expect(history.totalCancellations).toBe(2);
    expect(history.noShowCount).toBe(1);
    expect(history.totalPenaltyFees).toBe(15000);
    expect(history.isBlacklisted).toBe(false);
  });

  it('キャンセル履歴がない顧客でも正常に処理できる', async () => {
    const emptyQueryBuilder = createMockQueryBuilder([]);
    const customerQueryBuilder = createMockQueryBuilder([{ is_blacklisted: false }]);
    customerQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: { is_blacklisted: false }, error: null });
        return Promise.resolve({ data: { is_blacklisted: false }, error: null });
      },
    });

    mockSupabaseClient.from
      .mockReturnValueOnce(emptyQueryBuilder)
      .mockReturnValueOnce(customerQueryBuilder);

    const history = await cancellationService.getCustomerHistory(testData.companyId, testData.customerId);

    expect(history.totalCancellations).toBe(0);
    expect(history.noShowCount).toBe(0);
    expect(history.totalPenaltyFees).toBe(0);
  });
});

describe('イレギュラーシナリオ: 来店キャンセル', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('来店をキャンセルするAPI呼び出しが正しく行われる', async () => {
    const cancelledVisit = {
      id: testData.visitId,
      company_id: testData.companyId,
      store_id: testData.storeId,
      customer_id: testData.customerId,
      status: 'cancelled',
      check_in_at: new Date().toISOString(),
    };

    const queryBuilder = createMockQueryBuilder([cancelledVisit]);
    queryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: cancelledVisit, error: null });
        return Promise.resolve({ data: cancelledVisit, error: null });
      },
    });

    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const result = await visitService.cancel(testData.visitId, 'お客様都合');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('visits');
  });
});

describe('イレギュラーシナリオ: 予約変更', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('予約日時を変更するAPI呼び出しが正しく行われる', async () => {
    const updatedReservation = {
      id: testData.reservationId,
      company_id: testData.companyId,
      store_id: testData.storeId,
      customer_id: testData.customerId,
      staff_id: testData.staffId,
      status: 'confirmed',
      start_time: '2024-01-21T14:00:00Z',
      end_time: '2024-01-21T15:00:00Z',
    };

    const queryBuilder = createMockQueryBuilder([updatedReservation]);
    queryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: updatedReservation, error: null });
        return Promise.resolve({ data: updatedReservation, error: null });
      },
    });

    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    await reservationService.update(testData.reservationId, {
      start_time: '2024-01-21T14:00:00Z',
      end_time: '2024-01-21T15:00:00Z',
    });

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('reservations');
  });

  it('予約担当スタッフを変更するAPI呼び出しが正しく行われる', async () => {
    const newStaffId = 'staff-002';

    const updatedReservation = {
      id: testData.reservationId,
      company_id: testData.companyId,
      store_id: testData.storeId,
      customer_id: testData.customerId,
      staff_id: newStaffId,
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

    await reservationService.update(testData.reservationId, {
      staff_id: newStaffId,
    });

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('reservations');
  });
});

describe('イレギュラーシナリオ: 日次締め後の修正', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('前日の売上を取り消しできる', async () => {
    const yesterdaySale = {
      id: testData.saleId,
      company_id: testData.companyId,
      store_id: testData.storeId,
      sale_number: 'SALE-YESTERDAY',
      total_amount: 15000,
      points_used: 0,
      points_earned: 150,
      status: 'completed',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    };

    const voidedSale = {
      ...yesterdaySale,
      status: 'voided',
      voided_at: new Date().toISOString(),
      voided_by: testData.staffId,
      void_reason: '前日売上の修正',
    };

    const getByIdQueryBuilder = createMockQueryBuilder([yesterdaySale]);
    getByIdQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: yesterdaySale, error: null });
        return Promise.resolve({ data: yesterdaySale, error: null });
      },
    });

    const updateQueryBuilder = createMockQueryBuilder([voidedSale]);
    updateQueryBuilder.single = jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: voidedSale, error: null });
        return Promise.resolve({ data: voidedSale, error: null });
      },
    });

    mockSupabaseClient.from
      .mockReturnValueOnce(getByIdQueryBuilder)
      .mockReturnValueOnce(updateQueryBuilder)
      .mockReturnValueOnce(createMockQueryBuilder([]));

    const result = await saleService.void(testData.saleId, '前日売上の修正', testData.staffId);

    expect(result.status).toBe('voided');
    expect(result.void_reason).toBe('前日売上の修正');
  });
});

describe('イレギュラーシナリオ: キャンセルポリシー', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('cancellationService.savePolicy メソッドが存在する', () => {
    expect(typeof cancellationService.savePolicy).toBe('function');
  });

  it('cancellationService.getPolicy メソッドが存在する', () => {
    expect(typeof cancellationService.getPolicy).toBe('function');
  });

  it('デフォルトポリシーが正しい構造を持つ', () => {
    const policy = cancellationService.getDefaultPolicy(testData.companyId);

    expect(policy).toHaveProperty('id');
    expect(policy).toHaveProperty('companyId');
    expect(policy).toHaveProperty('name');
    expect(policy).toHaveProperty('rules');
    expect(policy).toHaveProperty('noShowFeePercentage');
    expect(policy).toHaveProperty('maxNoShowsBeforeBlacklist');
    expect(policy).toHaveProperty('isActive');
  });
});
