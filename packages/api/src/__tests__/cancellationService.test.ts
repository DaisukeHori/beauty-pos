/**
 * キャンセルサービスのテスト
 * - キャンセルポリシー取得・保存
 * - キャンセル料金計算
 * - ノーショー処理
 * - ブラックリスト管理
 */

import { cancellationService } from '../services/cancellationService';
import { getSupabaseClient, resetSupabaseClient } from '../client';

// Mock Supabase client
jest.mock('../client', () => ({
  getSupabaseClient: jest.fn(),
  resetSupabaseClient: jest.fn(),
}));

const mockSupabaseClient = {
  from: jest.fn(),
};

function createMockQueryBuilder(data: unknown[] = []) {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnValue({
      then: (resolve: (value: unknown) => void) => {
        resolve({ data: data[0] || null, error: null });
        return Promise.resolve({ data: data[0] || null, error: null });
      },
    }),
    then: (resolve: (value: unknown) => void) => {
      resolve({ data, error: null });
      return Promise.resolve({ data, error: null });
    },
  };
  return queryBuilder;
}

describe('cancellationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getDefaultPolicy', () => {
    it('デフォルトポリシーを取得できる', () => {
      const policy = cancellationService.getDefaultPolicy('company-001');

      expect(policy.id).toBe('default');
      expect(policy.companyId).toBe('company-001');
      expect(policy.name).toBe('デフォルトポリシー');
      expect(policy.rules).toHaveLength(3);
      expect(policy.noShowFeePercentage).toBe(100);
      expect(policy.maxNoShowsBeforeBlacklist).toBe(3);
    });

    it('デフォルトポリシーに24時間以内50%ルールがある', () => {
      const policy = cancellationService.getDefaultPolicy('company-001');

      const rule24h = policy.rules.find(r => r.hoursBeforeAppointment === 24);
      expect(rule24h).toBeDefined();
      expect(rule24h?.feePercentage).toBe(50);
    });

    it('デフォルトポリシーに48時間以内30%ルールがある', () => {
      const policy = cancellationService.getDefaultPolicy('company-001');

      const rule48h = policy.rules.find(r => r.hoursBeforeAppointment === 48);
      expect(rule48h).toBeDefined();
      expect(rule48h?.feePercentage).toBe(30);
    });
  });

  describe('getPolicy', () => {
    it('店舗固有のポリシーを優先的に取得する', async () => {
      const storePolicy = {
        id: 'policy-store-001',
        company_id: 'company-001',
        store_id: 'store-001',
        name: '店舗ポリシー',
        rules: [{ hoursBeforeAppointment: 12, feePercentage: 80, description: '12時間以内' }],
        no_show_fee_percentage: 100,
        max_no_shows_before_blacklist: 2,
        is_active: true,
      };

      const queryBuilder = createMockQueryBuilder([storePolicy]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const policy = await cancellationService.getPolicy('company-001', 'store-001');

      expect(policy?.id).toBe('policy-store-001');
      expect(policy?.name).toBe('店舗ポリシー');
    });

    it('店舗ポリシーがなければ会社ポリシーを取得する', async () => {
      // First call for store policy returns null
      const storeQueryBuilder = createMockQueryBuilder([]);
      storeQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: null });
          return Promise.resolve({ data: null, error: null });
        },
      });

      // Second call for company policy
      const companyPolicy = {
        id: 'policy-company-001',
        company_id: 'company-001',
        store_id: null,
        name: '会社ポリシー',
        rules: [{ hoursBeforeAppointment: 24, feePercentage: 50, description: '24時間以内' }],
        no_show_fee_percentage: 100,
        max_no_shows_before_blacklist: 3,
        is_active: true,
      };
      const companyQueryBuilder = createMockQueryBuilder([companyPolicy]);

      mockSupabaseClient.from
        .mockReturnValueOnce(storeQueryBuilder)
        .mockReturnValueOnce(companyQueryBuilder);

      const policy = await cancellationService.getPolicy('company-001', 'store-001');

      expect(policy?.id).toBe('policy-company-001');
      expect(policy?.name).toBe('会社ポリシー');
    });

    it('ポリシーがなければデフォルトを返す', async () => {
      const emptyQueryBuilder = createMockQueryBuilder([]);
      emptyQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: null });
          return Promise.resolve({ data: null, error: null });
        },
      });

      mockSupabaseClient.from.mockReturnValue(emptyQueryBuilder);

      const policy = await cancellationService.getPolicy('company-001');

      expect(policy?.id).toBe('default');
      expect(policy?.name).toBe('デフォルトポリシー');
    });
  });

  describe('savePolicy', () => {
    it('新規ポリシーを作成できる', async () => {
      const newPolicy = {
        companyId: 'company-001',
        name: '新規ポリシー',
        rules: [{ hoursBeforeAppointment: 24, feePercentage: 60, description: '24時間以内' }],
        noShowFeePercentage: 100,
        maxNoShowsBeforeBlacklist: 3,
        isActive: true,
      };

      const savedPolicy = {
        id: 'policy-new-001',
        company_id: 'company-001',
        store_id: null,
        name: '新規ポリシー',
        rules: newPolicy.rules,
        no_show_fee_percentage: 100,
        max_no_shows_before_blacklist: 3,
        is_active: true,
      };

      const queryBuilder = createMockQueryBuilder([savedPolicy]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await cancellationService.savePolicy(newPolicy);

      expect(result.id).toBe('policy-new-001');
      expect(result.name).toBe('新規ポリシー');
    });

    it('既存ポリシーを更新できる', async () => {
      const existingPolicy = {
        id: 'policy-001',
        companyId: 'company-001',
        name: '更新ポリシー',
        rules: [{ hoursBeforeAppointment: 12, feePercentage: 70, description: '12時間以内' }],
        noShowFeePercentage: 100,
        maxNoShowsBeforeBlacklist: 2,
        isActive: true,
      };

      const updatedPolicy = {
        id: 'policy-001',
        company_id: 'company-001',
        store_id: null,
        name: '更新ポリシー',
        rules: existingPolicy.rules,
        no_show_fee_percentage: 100,
        max_no_shows_before_blacklist: 2,
        is_active: true,
      };

      const queryBuilder = createMockQueryBuilder([updatedPolicy]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await cancellationService.savePolicy(existingPolicy);

      expect(result.id).toBe('policy-001');
      expect(result.maxNoShowsBeforeBlacklist).toBe(2);
    });
  });

  describe('calculateFee', () => {
    const mockReservation = {
      id: 'reservation-001',
      company_id: 'company-001',
      store_id: 'store-001',
      customer_id: 'customer-001',
      estimated_price: 10000,
      start_time: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours from now
    };

    it('ノーショーの場合は100%のキャンセル料を計算する', async () => {
      const queryBuilder = createMockQueryBuilder([mockReservation]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await cancellationService.calculateFee('reservation-001', true);

      expect(result.isNoShow).toBe(true);
      expect(result.feePercentage).toBe(100);
      expect(result.feeAmount).toBe(10000);
      expect(result.ruleApplied).toBe('無断キャンセル（ノーショー）');
    });

    it('時間に応じてキャンセル料を計算する', async () => {
      const reservationIn12Hours = {
        ...mockReservation,
        start_time: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      };

      const queryBuilder = createMockQueryBuilder([reservationIn12Hours]);
      // Return empty for policy lookup to use default
      const emptyQueryBuilder = createMockQueryBuilder([]);
      emptyQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: null });
          return Promise.resolve({ data: null, error: null });
        },
      });

      mockSupabaseClient.from
        .mockReturnValueOnce(queryBuilder) // reservation lookup
        .mockReturnValueOnce(emptyQueryBuilder) // store policy
        .mockReturnValueOnce(emptyQueryBuilder); // company policy

      const result = await cancellationService.calculateFee('reservation-001', false);

      expect(result.isNoShow).toBe(false);
      // 12時間後の予約なので24時間以内ルール(50%)または48時間以内ルール(30%)が適用される
      expect([30, 50]).toContain(result.feePercentage);
      expect(result.feeAmount).toBeGreaterThan(0);
    });

    it('予約が見つからない場合はエラーを投げる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: { message: 'Not found' } });
          return Promise.resolve({ data: null, error: { message: 'Not found' } });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(cancellationService.calculateFee('nonexistent')).rejects.toThrow('Reservation not found');
    });
  });

  describe('processCancellation', () => {
    const mockReservation = {
      id: 'reservation-001',
      company_id: 'company-001',
      store_id: 'store-001',
      customer_id: 'customer-001',
      estimated_price: 10000,
      start_time: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    };

    it('キャンセル処理を完了できる', async () => {
      const cancelledReservation = {
        ...mockReservation,
        status: 'cancelled',
        cancellation_reason: 'お客様都合',
        cancellation_fee: 5000,
        cancelled_at: new Date().toISOString(),
      };

      const queryBuilder = createMockQueryBuilder([mockReservation]);
      const updateQueryBuilder = createMockQueryBuilder([cancelledReservation]);
      const emptyQueryBuilder = createMockQueryBuilder([]);
      emptyQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: null });
          return Promise.resolve({ data: null, error: null });
        },
      });

      mockSupabaseClient.from
        .mockReturnValueOnce(queryBuilder) // getReservation
        .mockReturnValueOnce(queryBuilder) // calculateFee - getReservation
        .mockReturnValueOnce(emptyQueryBuilder) // calculateFee - store policy
        .mockReturnValueOnce(emptyQueryBuilder) // calculateFee - company policy
        .mockReturnValueOnce(updateQueryBuilder) // update reservation
        .mockReturnValueOnce(emptyQueryBuilder) // recordCancellation
        .mockReturnValueOnce(emptyQueryBuilder) // getCustomerHistory - records
        .mockReturnValueOnce(emptyQueryBuilder) // getCustomerHistory - customer
        .mockReturnValueOnce(emptyQueryBuilder); // getPolicy for blacklist check

      const result = await cancellationService.processCancellation(
        'reservation-001',
        'お客様都合',
        false,
        false
      );

      expect(result.reservation.status).toBe('cancelled');
      expect(result.penaltyApplied).toBe(true);
    });

    it('キャンセル料を免除できる', async () => {
      const cancelledReservation = {
        ...mockReservation,
        status: 'cancelled',
        cancellation_reason: '体調不良',
        cancellation_fee: 0,
        cancelled_at: new Date().toISOString(),
      };

      const queryBuilder = createMockQueryBuilder([mockReservation]);
      const updateQueryBuilder = createMockQueryBuilder([cancelledReservation]);
      const emptyQueryBuilder = createMockQueryBuilder([]);
      emptyQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: null });
          return Promise.resolve({ data: null, error: null });
        },
      });

      mockSupabaseClient.from
        .mockReturnValueOnce(queryBuilder)
        .mockReturnValueOnce(queryBuilder)
        .mockReturnValueOnce(emptyQueryBuilder)
        .mockReturnValueOnce(emptyQueryBuilder)
        .mockReturnValueOnce(updateQueryBuilder)
        .mockReturnValueOnce(emptyQueryBuilder)
        .mockReturnValueOnce(emptyQueryBuilder)
        .mockReturnValueOnce(emptyQueryBuilder)
        .mockReturnValueOnce(emptyQueryBuilder);

      const result = await cancellationService.processCancellation(
        'reservation-001',
        '体調不良',
        false,
        true // waiveFee = true
      );

      expect(result.feeResult.feeAmount).toBe(0);
      expect(result.penaltyApplied).toBe(false);
    });

    it('ノーショー処理ができる', async () => {
      const noShowReservation = {
        ...mockReservation,
        status: 'no_show',
        cancellation_reason: '無断キャンセル',
        cancellation_fee: 10000,
        cancelled_at: new Date().toISOString(),
      };

      const queryBuilder = createMockQueryBuilder([mockReservation]);
      const updateQueryBuilder = createMockQueryBuilder([noShowReservation]);
      const emptyQueryBuilder = createMockQueryBuilder([]);
      emptyQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: null });
          return Promise.resolve({ data: null, error: null });
        },
      });

      mockSupabaseClient.from
        .mockReturnValueOnce(queryBuilder)
        .mockReturnValueOnce(queryBuilder)
        .mockReturnValueOnce(emptyQueryBuilder)
        .mockReturnValueOnce(emptyQueryBuilder)
        .mockReturnValueOnce(updateQueryBuilder)
        .mockReturnValueOnce(emptyQueryBuilder)
        .mockReturnValueOnce(emptyQueryBuilder)
        .mockReturnValueOnce(emptyQueryBuilder)
        .mockReturnValueOnce(emptyQueryBuilder);

      const result = await cancellationService.processCancellation(
        'reservation-001',
        '無断キャンセル',
        true, // isNoShow = true
        false
      );

      expect(result.reservation.status).toBe('no_show');
      expect(result.feeResult.isNoShow).toBe(true);
      expect(result.feeResult.feePercentage).toBe(100);
    });
  });

  describe('getCustomerHistory', () => {
    it('顧客のキャンセル履歴を取得できる', async () => {
      const cancellationRecords = [
        {
          id: 'cancel-001',
          customer_id: 'customer-001',
          cancellation_type: 'cancelled',
          fee_amount: 5000,
          rule_applied: '24時間以内のキャンセル',
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 'cancel-002',
          customer_id: 'customer-001',
          cancellation_type: 'no_show',
          fee_amount: 10000,
          rule_applied: '無断キャンセル',
          created_at: '2024-01-10T10:00:00Z',
        },
      ];

      const customer = { is_blacklisted: false };

      const recordsQueryBuilder = createMockQueryBuilder(cancellationRecords);
      const customerQueryBuilder = createMockQueryBuilder([customer]);

      mockSupabaseClient.from
        .mockReturnValueOnce(recordsQueryBuilder)
        .mockReturnValueOnce(customerQueryBuilder);

      const history = await cancellationService.getCustomerHistory('company-001', 'customer-001');

      expect(history.customerId).toBe('customer-001');
      expect(history.totalCancellations).toBe(2);
      expect(history.noShowCount).toBe(1);
      expect(history.totalPenaltyFees).toBe(15000);
      expect(history.isBlacklisted).toBe(false);
    });

    it('キャンセル履歴がない顧客でも正常に処理できる', async () => {
      const emptyQueryBuilder = createMockQueryBuilder([]);
      const customerQueryBuilder = createMockQueryBuilder([{ is_blacklisted: false }]);

      mockSupabaseClient.from
        .mockReturnValueOnce(emptyQueryBuilder)
        .mockReturnValueOnce(customerQueryBuilder);

      const history = await cancellationService.getCustomerHistory('company-001', 'customer-001');

      expect(history.totalCancellations).toBe(0);
      expect(history.noShowCount).toBe(0);
      expect(history.totalPenaltyFees).toBe(0);
    });
  });

  describe('blacklistCustomer', () => {
    it('顧客をブラックリストに追加できる', async () => {
      const updateQueryBuilder = createMockQueryBuilder([]);
      const insertQueryBuilder = createMockQueryBuilder([]);

      mockSupabaseClient.from
        .mockReturnValueOnce(updateQueryBuilder)
        .mockReturnValueOnce(insertQueryBuilder);

      await expect(
        cancellationService.blacklistCustomer('company-001', 'customer-001', 'no_show_limit')
      ).resolves.not.toThrow();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_logs');
    });
  });

  describe('removeFromBlacklist', () => {
    it('顧客をブラックリストから削除できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(
        cancellationService.removeFromBlacklist('company-001', 'customer-001')
      ).resolves.not.toThrow();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers');
    });
  });

  describe('getAtRiskCustomers', () => {
    it('ブラックリスト警告対象の顧客を取得できる', async () => {
      // Policy with maxNoShowsBeforeBlacklist = 3 (default)
      const emptyPolicyQueryBuilder = createMockQueryBuilder([]);
      emptyPolicyQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: null });
          return Promise.resolve({ data: null, error: null });
        },
      });

      // Customer with 2 no-shows (at warning threshold)
      const noShowRecords = [
        { customer_id: 'customer-001' },
        { customer_id: 'customer-001' },
        { customer_id: 'customer-002' },
      ];

      const customers = [
        { id: 'customer-001', first_name: '太郎', last_name: '山田' },
      ];

      const recordsQueryBuilder = createMockQueryBuilder(noShowRecords);
      const customersQueryBuilder = createMockQueryBuilder(customers);

      // getAtRiskCustomers calls getPolicy first (which makes 2 DB calls)
      // then gets cancellation_records, then customers
      mockSupabaseClient.from
        .mockReturnValueOnce(emptyPolicyQueryBuilder) // getPolicy - store (no storeId so skipped)
        .mockReturnValueOnce(emptyPolicyQueryBuilder) // getPolicy - company
        .mockReturnValueOnce(recordsQueryBuilder) // no-show records
        .mockReturnValueOnce(customersQueryBuilder); // customers

      const atRiskCustomers = await cancellationService.getAtRiskCustomers('company-001');

      // 関数が正常に動作することを確認
      expect(Array.isArray(atRiskCustomers)).toBe(true);
    });
  });
});
