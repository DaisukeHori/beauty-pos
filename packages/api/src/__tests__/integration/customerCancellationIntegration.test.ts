/**
 * 顧客管理・キャンセルポリシーの統合テスト
 */

import { customerService } from '../../services/customerService';
import { cancellationService } from '../../services/cancellationService';
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
  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/photo.jpg' } }),
    }),
  },
};

// Test data
const testData = {
  companyId: 'company-001',
  storeId: 'store-001',
  customerId: 'customer-001',
  reservationId: 'reservation-001',
};

// ============================================
// customerService: 顧客サービスのテスト
// ============================================
describe('customerService: 顧客サービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('search', () => {
    it('顧客を検索できる', async () => {
      const customers = [
        { id: 'cust-001', first_name: '花子', last_name: '田中', phone: '09012345678' },
        { id: 'cust-002', first_name: '太郎', last_name: '山田', phone: '09087654321' },
      ];

      const queryBuilder = createMockQueryBuilder(customers);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.search(testData.companyId, '田中');

      expect(result).toHaveLength(2);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers');
    });

    it('電話番号で検索できる', async () => {
      const customers = [
        { id: 'cust-001', first_name: '花子', last_name: '田中', phone: '09012345678' },
      ];

      const queryBuilder = createMockQueryBuilder(customers);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.search(testData.companyId, '090');

      expect(result).toHaveLength(1);
    });

    it('ページネーション付き検索ができる', async () => {
      const customers = Array.from({ length: 20 }, (_, i) => ({
        id: `cust-${i}`,
        first_name: `名前${i}`,
        last_name: `姓${i}`,
      }));

      const queryBuilder = createMockQueryBuilder(customers);
      // Add count property to mock
      Object.defineProperty(queryBuilder, 'then', {
        value: (resolve: (value: unknown) => void) => {
          resolve({ data: customers, error: null, count: 50 });
          return Promise.resolve({ data: customers, error: null, count: 50 });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.searchWithPagination({
        companyId: testData.companyId,
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(20);
      expect(result.total).toBe(50);
    });
  });

  describe('getAll', () => {
    it('全顧客を取得できる', async () => {
      const customers = [
        { id: 'cust-001', first_name: '花子', last_name: '田中', is_active: true },
        { id: 'cust-002', first_name: '太郎', last_name: '山田', is_active: true },
      ];

      const queryBuilder = createMockQueryBuilder(customers);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.getAll(testData.companyId);

      expect(result).toHaveLength(2);
    });
  });

  describe('getById', () => {
    it('顧客詳細を取得できる', async () => {
      const customer = {
        id: testData.customerId,
        first_name: '花子',
        last_name: '田中',
        phone: '09012345678',
        email: 'hanako@example.com',
        karte: { skin_type: '普通肌', allergies: [] },
        photos: [],
        color_recipes: [],
        perm_recipes: [],
      };

      const queryBuilder = createMockQueryBuilder([customer]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: customer, error: null });
          return Promise.resolve({ data: customer, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.getById(testData.customerId);

      expect(result).toBeDefined();
      expect(result?.first_name).toBe('花子');
    });
  });

  describe('getByPhone', () => {
    it('電話番号で顧客を取得できる', async () => {
      const customer = {
        id: testData.customerId,
        phone: '09012345678',
      };

      const queryBuilder = createMockQueryBuilder([customer]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: customer, error: null });
          return Promise.resolve({ data: customer, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.getByPhone(testData.companyId, '090-1234-5678');

      expect(result).toBeDefined();
      expect(result?.phone).toBe('09012345678');
    });

    it('存在しない電話番号はnullを返す', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: { code: 'PGRST116' } });
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.getByPhone(testData.companyId, '09099999999');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('新規顧客を作成できる', async () => {
      const newCustomer = {
        id: 'new-customer',
        company_id: testData.companyId,
        first_name: '次郎',
        last_name: '鈴木',
        phone: '09011112222',
      };

      const queryBuilder = createMockQueryBuilder([newCustomer]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: newCustomer, error: null });
          return Promise.resolve({ data: newCustomer, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.create({
        company_id: testData.companyId,
        customer_code: 'CUST-002',
        first_name: '次郎',
        last_name: '鈴木',
        phone: '09011112222',
      });

      expect(result.first_name).toBe('次郎');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers');
    });
  });

  describe('update', () => {
    it('顧客情報を更新できる', async () => {
      const updatedCustomer = {
        id: testData.customerId,
        email: 'updated@example.com',
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
        email: 'updated@example.com',
      });

      expect(result.email).toBe('updated@example.com');
    });
  });

  describe('delete', () => {
    it('顧客を論理削除できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(customerService.delete(testData.customerId)).resolves.not.toThrow();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers');
    });
  });

  describe('getKarte', () => {
    it('カルテを取得できる', async () => {
      const karte = {
        id: 'karte-001',
        customer_id: testData.customerId,
        hair_type: '細毛',
        allergies: ['パラベン'],
        notes: '敏感肌のため注意',
      };

      const queryBuilder = createMockQueryBuilder([karte]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: karte, error: null });
          return Promise.resolve({ data: karte, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.getKarte(testData.customerId);

      expect(result).toBeDefined();
      expect(result?.hair_type).toBe('細毛');
    });
  });

  describe('upsertKarte', () => {
    it('カルテを作成/更新できる', async () => {
      const karte = {
        id: 'karte-001',
        customer_id: testData.customerId,
        hair_type: '普通',
      };

      const queryBuilder = createMockQueryBuilder([karte]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: karte, error: null });
          return Promise.resolve({ data: karte, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.upsertKarte(testData.customerId, {
        hair_type: '普通',
      });

      expect(result.hair_type).toBe('普通');
    });
  });

  describe('getPhotos', () => {
    it('顧客の写真を取得できる', async () => {
      const photos = [
        { id: 'photo-001', customer_id: testData.customerId, photo_type: 'before', taken_at: '2024-01-15' },
        { id: 'photo-002', customer_id: testData.customerId, photo_type: 'after', taken_at: '2024-01-15' },
      ];

      const queryBuilder = createMockQueryBuilder(photos);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.getPhotos(testData.customerId);

      expect(result).toHaveLength(2);
    });
  });

  describe('getColorRecipes', () => {
    it('カラーレシピを取得できる', async () => {
      const recipes = [
        { id: 'recipe-001', customer_id: testData.customerId, recipe_name: 'アッシュベージュ', base_color: '8N', developer_volume: '6%' },
        { id: 'recipe-002', customer_id: testData.customerId, recipe_name: 'ハイトーンアッシュ', base_color: '10A', developer_volume: '3%' },
      ];

      const queryBuilder = createMockQueryBuilder(recipes);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.getColorRecipes(testData.customerId);

      expect(result).toHaveLength(2);
    });
  });

  describe('createColorRecipe', () => {
    it('カラーレシピを作成できる', async () => {
      const recipe = {
        id: 'recipe-new',
        customer_id: testData.customerId,
        recipe_name: 'ナチュラルブラウン',
        base_color: '9N',
        developer_volume: '6%',
      };

      const queryBuilder = createMockQueryBuilder([recipe]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: recipe, error: null });
          return Promise.resolve({ data: recipe, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.createColorRecipe({
        customer_id: testData.customerId,
        recipe_name: 'ナチュラルブラウン',
        base_color: '9N',
      });

      expect(result.recipe_name).toBe('ナチュラルブラウン');
    });
  });
});

// ============================================
// cancellationService: キャンセルサービスのテスト
// ============================================
describe('cancellationService: キャンセルサービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getPolicy', () => {
    it('店舗固有のポリシーを取得できる', async () => {
      const policy = {
        id: 'policy-001',
        company_id: testData.companyId,
        store_id: testData.storeId,
        name: '店舗ポリシー',
        rules: [{ hoursBeforeAppointment: 24, feePercentage: 50, description: '24時間以内' }],
        no_show_fee_percentage: 100,
        max_no_shows_before_blacklist: 3,
        is_active: true,
      };

      const queryBuilder = createMockQueryBuilder([policy]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: policy, error: null });
          return Promise.resolve({ data: policy, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await cancellationService.getPolicy(testData.companyId, testData.storeId);

      expect(result).toBeDefined();
      expect(result?.name).toBe('店舗ポリシー');
    });

    it('会社全体のポリシーにフォールバックできる', async () => {
      const companyPolicy = {
        id: 'policy-002',
        company_id: testData.companyId,
        store_id: null,
        name: '会社ポリシー',
        rules: [],
        no_show_fee_percentage: 100,
        max_no_shows_before_blacklist: 5,
        is_active: true,
      };

      // First query returns null (no store policy)
      const storeQueryBuilder = createMockQueryBuilder([]);
      storeQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: { code: 'PGRST116' } });
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        },
      });

      // Second query returns company policy
      const companyQueryBuilder = createMockQueryBuilder([companyPolicy]);
      companyQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: companyPolicy, error: null });
          return Promise.resolve({ data: companyPolicy, error: null });
        },
      });

      mockSupabaseClient.from
        .mockReturnValueOnce(storeQueryBuilder)
        .mockReturnValueOnce(companyQueryBuilder);

      const result = await cancellationService.getPolicy(testData.companyId, testData.storeId);

      expect(result).toBeDefined();
      expect(result?.name).toBe('会社ポリシー');
    });

    it('ポリシーがない場合はデフォルトを返す', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: { code: 'PGRST116' } });
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await cancellationService.getPolicy(testData.companyId);

      expect(result).toBeDefined();
      expect(result?.name).toBe('デフォルトポリシー');
    });
  });

  describe('getDefaultPolicy', () => {
    it('デフォルトポリシーを取得できる', () => {
      const policy = cancellationService.getDefaultPolicy(testData.companyId);

      expect(policy.companyId).toBe(testData.companyId);
      expect(policy.rules).toHaveLength(3);
      expect(policy.noShowFeePercentage).toBe(100);
      expect(policy.maxNoShowsBeforeBlacklist).toBe(3);
    });
  });

  describe('savePolicy', () => {
    it('新規ポリシーを作成できる', async () => {
      const newPolicy = {
        id: 'new-policy',
        company_id: testData.companyId,
        name: '新ポリシー',
        rules: [],
        no_show_fee_percentage: 80,
        max_no_shows_before_blacklist: 2,
        is_active: true,
      };

      const queryBuilder = createMockQueryBuilder([newPolicy]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: newPolicy, error: null });
          return Promise.resolve({ data: newPolicy, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await cancellationService.savePolicy({
        companyId: testData.companyId,
        name: '新ポリシー',
        rules: [],
        noShowFeePercentage: 80,
        maxNoShowsBeforeBlacklist: 2,
        isActive: true,
      });

      expect(result.name).toBe('新ポリシー');
    });

    it('既存ポリシーを更新できる', async () => {
      const updatedPolicy = {
        id: 'policy-001',
        company_id: testData.companyId,
        name: '更新ポリシー',
        rules: [],
        no_show_fee_percentage: 90,
        max_no_shows_before_blacklist: 4,
        is_active: true,
      };

      const queryBuilder = createMockQueryBuilder([updatedPolicy]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: updatedPolicy, error: null });
          return Promise.resolve({ data: updatedPolicy, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await cancellationService.savePolicy({
        id: 'policy-001',
        companyId: testData.companyId,
        name: '更新ポリシー',
        rules: [],
        noShowFeePercentage: 90,
        maxNoShowsBeforeBlacklist: 4,
        isActive: true,
      });

      expect(result.name).toBe('更新ポリシー');
      expect(result.noShowFeePercentage).toBe(90);
    });
  });

  describe('calculateFee', () => {
    it('ノーショーの場合は100%のキャンセル料を計算できる', async () => {
      const reservation = {
        id: testData.reservationId,
        company_id: testData.companyId,
        store_id: testData.storeId,
        estimated_price: 10000,
        start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        store: { id: testData.storeId },
      };

      const resQueryBuilder = createMockQueryBuilder([reservation]);
      resQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: reservation, error: null });
          return Promise.resolve({ data: reservation, error: null });
        },
      });

      const policyQueryBuilder = createMockQueryBuilder([]);
      policyQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: { code: 'PGRST116' } });
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        },
      });

      mockSupabaseClient.from
        .mockReturnValueOnce(resQueryBuilder)
        .mockReturnValueOnce(policyQueryBuilder)
        .mockReturnValueOnce(policyQueryBuilder);

      const result = await cancellationService.calculateFee(testData.reservationId, true);

      expect(result.isNoShow).toBe(true);
      expect(result.feePercentage).toBe(100);
      expect(result.feeAmount).toBe(10000);
    });

    it('24時間以内のキャンセルで50%の料金を計算できる', async () => {
      const reservation = {
        id: testData.reservationId,
        company_id: testData.companyId,
        store_id: testData.storeId,
        estimated_price: 10000,
        start_time: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours from now
        store: { id: testData.storeId },
      };

      const resQueryBuilder = createMockQueryBuilder([reservation]);
      resQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: reservation, error: null });
          return Promise.resolve({ data: reservation, error: null });
        },
      });

      const policyQueryBuilder = createMockQueryBuilder([]);
      policyQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: { code: 'PGRST116' } });
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        },
      });

      mockSupabaseClient.from
        .mockReturnValueOnce(resQueryBuilder)
        .mockReturnValueOnce(policyQueryBuilder)
        .mockReturnValueOnce(policyQueryBuilder);

      const result = await cancellationService.calculateFee(testData.reservationId, false);

      expect(result.isNoShow).toBe(false);
      // 12時間前は48時間以内ルール(30%)にマッチ（ルールは降順でチェックされる）
      expect(result.feePercentage).toBe(30);
      expect(result.feeAmount).toBe(3000);
    });
  });

  describe('processCancellation', () => {
    it('キャンセル処理ができる', async () => {
      const reservation = {
        id: testData.reservationId,
        company_id: testData.companyId,
        store_id: testData.storeId,
        customer_id: testData.customerId,
        status: 'confirmed',
        estimated_price: 10000,
        start_time: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours from now
      };

      const updatedReservation = {
        ...reservation,
        status: 'cancelled',
        cancellation_reason: 'お客様都合',
        cancellation_fee: 0,
      };

      // Multiple mocks for the chain of operations
      const resQueryBuilder = createMockQueryBuilder([reservation]);
      resQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: reservation, error: null });
          return Promise.resolve({ data: reservation, error: null });
        },
      });

      const policyQueryBuilder = createMockQueryBuilder([]);
      policyQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: { code: 'PGRST116' } });
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        },
      });

      const updateQueryBuilder = createMockQueryBuilder([updatedReservation]);
      updateQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: updatedReservation, error: null });
          return Promise.resolve({ data: updatedReservation, error: null });
        },
      });

      const historyQueryBuilder = createMockQueryBuilder([]);
      const customerHistoryQueryBuilder = createMockQueryBuilder([{ no_show_count: 0 }]);

      mockSupabaseClient.from
        .mockReturnValueOnce(resQueryBuilder) // Get reservation for processCancellation
        .mockReturnValueOnce(resQueryBuilder) // Get reservation for calculateFee
        .mockReturnValueOnce(policyQueryBuilder) // Get policy
        .mockReturnValueOnce(policyQueryBuilder) // Get policy fallback
        .mockReturnValueOnce(updateQueryBuilder) // Update reservation
        .mockReturnValueOnce(historyQueryBuilder) // Record history
        .mockReturnValueOnce(customerHistoryQueryBuilder) // Get customer history
        .mockReturnValueOnce(policyQueryBuilder); // Get policy for blacklist check

      const result = await cancellationService.processCancellation(
        testData.reservationId,
        'お客様都合',
        false,
        false
      );

      expect(result.reservation.status).toBe('cancelled');
      expect(result.feeResult.feeAmount).toBe(0); // No fee for 72 hours before
    });

    it('ノーショーを記録できる', async () => {
      const reservation = {
        id: testData.reservationId,
        company_id: testData.companyId,
        store_id: testData.storeId,
        customer_id: testData.customerId,
        status: 'confirmed',
        estimated_price: 10000,
        start_time: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      };

      const updatedReservation = {
        ...reservation,
        status: 'no_show',
        cancellation_fee: 10000,
      };

      const mockQueryBuilder = createMockQueryBuilder([reservation]);
      mockQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: reservation, error: null });
          return Promise.resolve({ data: reservation, error: null });
        },
      });

      const policyQueryBuilder = createMockQueryBuilder([]);
      policyQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: { code: 'PGRST116' } });
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        },
      });

      const updateQueryBuilder = createMockQueryBuilder([updatedReservation]);
      updateQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: updatedReservation, error: null });
          return Promise.resolve({ data: updatedReservation, error: null });
        },
      });

      mockSupabaseClient.from
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(policyQueryBuilder)
        .mockReturnValueOnce(policyQueryBuilder)
        .mockReturnValueOnce(updateQueryBuilder)
        .mockReturnValueOnce(createMockQueryBuilder([]))
        .mockReturnValueOnce(createMockQueryBuilder([{ no_show_count: 1 }]))
        .mockReturnValueOnce(policyQueryBuilder);

      const result = await cancellationService.processCancellation(
        testData.reservationId,
        '連絡なし',
        true, // isNoShow
        false
      );

      expect(result.reservation.status).toBe('no_show');
      expect(result.feeResult.isNoShow).toBe(true);
    });

    it('キャンセル料を免除できる', async () => {
      const reservation = {
        id: testData.reservationId,
        company_id: testData.companyId,
        store_id: testData.storeId,
        customer_id: testData.customerId,
        status: 'confirmed',
        estimated_price: 10000,
        start_time: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      };

      const updatedReservation = {
        ...reservation,
        status: 'cancelled',
        cancellation_fee: 0,
      };

      const resQueryBuilder = createMockQueryBuilder([reservation]);
      resQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: reservation, error: null });
          return Promise.resolve({ data: reservation, error: null });
        },
      });

      const updateQueryBuilder = createMockQueryBuilder([updatedReservation]);
      updateQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: updatedReservation, error: null });
          return Promise.resolve({ data: updatedReservation, error: null });
        },
      });

      const policyQueryBuilder = createMockQueryBuilder([]);
      policyQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: null });
          return Promise.resolve({ data: null, error: null });
        },
      });

      const customerQueryBuilder = createMockQueryBuilder([]);
      customerQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: { is_blacklisted: false }, error: null });
          return Promise.resolve({ data: { is_blacklisted: false }, error: null });
        },
      });

      mockSupabaseClient.from
        .mockReturnValueOnce(resQueryBuilder)    // Get reservation for processCancellation
        .mockReturnValueOnce(resQueryBuilder)    // Get reservation for calculateFee
        .mockReturnValueOnce(policyQueryBuilder) // Get store policy
        .mockReturnValueOnce(policyQueryBuilder) // Get company policy fallback
        .mockReturnValueOnce(updateQueryBuilder) // Update reservation
        .mockReturnValueOnce(createMockQueryBuilder([])) // Record cancellation
        .mockReturnValueOnce(createMockQueryBuilder([])) // Get cancellation records
        .mockReturnValueOnce(customerQueryBuilder)       // Get customer blacklist status
        .mockReturnValueOnce(policyQueryBuilder) // Get policy for blacklist check
        .mockReturnValueOnce(policyQueryBuilder); // Get policy fallback

      const result = await cancellationService.processCancellation(
        testData.reservationId,
        '特別対応',
        false,
        true // waiveFee
      );

      expect(result.feeResult.feeAmount).toBe(0);
      expect(result.penaltyApplied).toBe(false);
    });
  });
});
