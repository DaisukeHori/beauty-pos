/**
 * 運営管理サービス（シフト・来店・ポイント・タグ）の統合テスト
 */

import { shiftService } from '../../services/shiftService';
import { visitService } from '../../services/visitService';
import { pointService } from '../../services/pointService';
import { tagService } from '../../services/tagService';
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
  shiftId: 'shift-001',
  attendanceId: 'attendance-001',
  tagId: 'tag-001',
};

// =================================
// shiftService Tests
// =================================
describe('shiftService: シフトサービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getByDateRange', () => {
    it('期間内のシフトを取得できる', async () => {
      const shifts = [
        { id: 'shift-001', staff_id: 'staff-001', date: '2024-01-15', start_time: '09:00', end_time: '18:00' },
        { id: 'shift-002', staff_id: 'staff-002', date: '2024-01-15', start_time: '10:00', end_time: '19:00' },
      ];

      const queryBuilder = createMockQueryBuilder(shifts);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await shiftService.getByDateRange(
        testData.storeId,
        '2024-01-15',
        '2024-01-21'
      );

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('shifts');
      expect(result).toHaveLength(2);
    });
  });

  describe('getByStaff', () => {
    it('スタッフのシフトを取得できる', async () => {
      const shifts = [
        { id: 'shift-001', staff_id: testData.staffId, date: '2024-01-15' },
        { id: 'shift-002', staff_id: testData.staffId, date: '2024-01-16' },
      ];

      const queryBuilder = createMockQueryBuilder(shifts);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await shiftService.getByStaff(
        testData.staffId,
        '2024-01-15',
        '2024-01-21'
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('create', () => {
    it('シフトを作成できる', async () => {
      const newShift = {
        id: 'shift-003',
        company_id: testData.companyId,
        store_id: testData.storeId,
        staff_id: testData.staffId,
        date: '2024-01-17',
        start_time: '09:00',
        end_time: '18:00',
      };

      const queryBuilder = createMockQueryBuilder([newShift]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: newShift, error: null });
          return Promise.resolve({ data: newShift, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await shiftService.create({
        company_id: testData.companyId,
        store_id: testData.storeId,
        staff_id: testData.staffId,
        date: '2024-01-17',
        start_time: '09:00',
        end_time: '18:00',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('shifts');
    });
  });

  describe('createBulk', () => {
    it('複数シフトを一括作成できる', async () => {
      const shifts = [
        { id: 'shift-003', date: '2024-01-17' },
        { id: 'shift-004', date: '2024-01-18' },
      ];

      const queryBuilder = createMockQueryBuilder(shifts);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await shiftService.createBulk([
        { company_id: testData.companyId, store_id: testData.storeId, staff_id: testData.staffId, date: '2024-01-17', start_time: '09:00', end_time: '18:00' },
        { company_id: testData.companyId, store_id: testData.storeId, staff_id: testData.staffId, date: '2024-01-18', start_time: '09:00', end_time: '18:00' },
      ]);

      expect(result).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('シフトを更新できる', async () => {
      const updatedShift = {
        id: testData.shiftId,
        start_time: '10:00',
        end_time: '19:00',
      };

      const queryBuilder = createMockQueryBuilder([updatedShift]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: updatedShift, error: null });
          return Promise.resolve({ data: updatedShift, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await shiftService.update(testData.shiftId, {
        start_time: '10:00',
        end_time: '19:00',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('shifts');
    });
  });

  describe('delete', () => {
    it('シフトを削除できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(shiftService.delete(testData.shiftId)).resolves.not.toThrow();
    });
  });

  describe('copyWeek', () => {
    it('週のシフトをコピーできる', async () => {
      const sourceShifts = [
        { id: 'shift-001', staff_id: 'staff-001', date: '2024-01-15', start_time: '09:00', end_time: '18:00' },
      ];

      const getQueryBuilder = createMockQueryBuilder(sourceShifts);
      const insertQueryBuilder = createMockQueryBuilder([]);

      mockSupabaseClient.from
        .mockReturnValueOnce(getQueryBuilder)
        .mockReturnValueOnce(insertQueryBuilder);

      const result = await shiftService.copyWeek(
        testData.storeId,
        '2024-01-15',
        '2024-01-22'
      );

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('shifts');
    });
  });
});

// =================================
// visitService Tests
// =================================
describe('visitService: 来店サービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getById', () => {
    it('来店詳細を取得できる', async () => {
      const visit = {
        id: 'visit-001',
        customer_id: testData.customerId,
        staff_id: testData.staffId,
        status: 'in_service',
      };

      const queryBuilder = createMockQueryBuilder([visit]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: visit, error: null });
          return Promise.resolve({ data: visit, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await visitService.getById('visit-001');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('visits');
    });
  });

  describe('getToday', () => {
    it('本日の来店を取得できる', async () => {
      const visits = [
        { id: 'visit-001', status: 'checked_in' },
        { id: 'visit-002', status: 'in_service' },
      ];

      const queryBuilder = createMockQueryBuilder(visits);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await visitService.getToday(testData.companyId, testData.storeId);

      expect(result).toHaveLength(2);
    });
  });

  describe('getActive', () => {
    it('アクティブな来店を取得できる', async () => {
      const visits = [
        { id: 'visit-001', status: 'in_service' },
      ];

      const queryBuilder = createMockQueryBuilder(visits);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await visitService.getActive(testData.companyId, testData.storeId);

      expect(result).toHaveLength(1);
    });
  });

  describe('checkIn', () => {
    it('来店チェックインができる', async () => {
      const visit = {
        id: 'visit-001',
        company_id: testData.companyId,
        store_id: testData.storeId,
        customer_id: testData.customerId,
        staff_id: testData.staffId,
        status: 'checked_in',
        check_in_at: new Date().toISOString(),
      };

      const queryBuilder = createMockQueryBuilder([visit]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: visit, error: null });
          return Promise.resolve({ data: visit, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await visitService.checkIn({
        company_id: testData.companyId,
        store_id: testData.storeId,
        customer_id: testData.customerId,
        staff_id: testData.staffId,
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('visits');
    });
  });

  describe('startService', () => {
    it('施術を開始できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(visitService.startService('visit-001')).resolves.not.toThrow();
    });
  });

  describe('endService', () => {
    it('施術を終了できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(visitService.endService('visit-001')).resolves.not.toThrow();
    });
  });

  describe('checkOut', () => {
    it('来店チェックアウトができる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(visitService.checkOut('visit-001')).resolves.not.toThrow();
    });
  });
});

// =================================
// pointService Tests
// =================================
describe('pointService: ポイントサービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getSettings', () => {
    it('ポイント設定を取得できる', async () => {
      const settings = {
        point_rate: 0.01,
        expiry_months: 12,
        min_points_to_use: 100,
      };

      const queryBuilder = createMockQueryBuilder([settings]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: settings, error: null });
          return Promise.resolve({ data: settings, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await pointService.getSettings(testData.companyId);

      expect(result).toHaveProperty('pointRate');
    });
  });

  describe('updateSettings', () => {
    it('ポイント設定を更新できる', async () => {
      const company = { settings: { point_rate: 0.01 } };
      const getQueryBuilder = createMockQueryBuilder([company]);
      getQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: company, error: null });
          return Promise.resolve({ data: company, error: null });
        },
      });
      const updateQueryBuilder = createMockQueryBuilder([]);

      mockSupabaseClient.from
        .mockReturnValueOnce(getQueryBuilder)
        .mockReturnValueOnce(updateQueryBuilder);

      await expect(
        pointService.updateSettings(testData.companyId, { pointRate: 0.02 })
      ).resolves.not.toThrow();
    });
  });

  describe('calculatePoints', () => {
    it('獲得ポイントを計算できる', async () => {
      const company = { settings: { point_rate: 0.01 } };
      const queryBuilder = createMockQueryBuilder([company]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: company, error: null });
          return Promise.resolve({ data: company, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const points = await pointService.calculatePoints(testData.companyId, 10000);
      expect(points).toBe(100);
    });
  });

  describe('getByCustomer', () => {
    it('顧客のポイント履歴を取得できる', async () => {
      const pointHistory = [
        { id: 'point-001', type: 'earn', points: 100, created_at: '2024-01-15T10:00:00Z' },
        { id: 'point-002', type: 'use', points: -50, created_at: '2024-01-16T14:00:00Z' },
      ];

      const queryBuilder = createMockQueryBuilder(pointHistory);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await pointService.getByCustomer(testData.customerId);

      expect(result).toHaveLength(2);
    });
  });

  describe('getBalance', () => {
    it('ポイント残高を取得できる', async () => {
      const customer = { points_balance: 500 };

      const queryBuilder = createMockQueryBuilder([customer]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: customer, error: null });
          return Promise.resolve({ data: customer, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const balance = await pointService.getBalance(testData.customerId);

      expect(balance).toBe(500);
    });
  });

  describe('earnPoints', () => {
    it('ポイントを付与できる', async () => {
      const customer = { points_balance: 500 };
      const settings = { settings: { point_rate: 0.01, point_expiry_months: 12 } };
      const transaction = { id: 'trans-001', points: 100, balance_after: 600 };

      const balanceQueryBuilder = createMockQueryBuilder([customer]);
      balanceQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: customer, error: null });
          return Promise.resolve({ data: customer, error: null });
        },
      });

      const settingsQueryBuilder = createMockQueryBuilder([settings]);
      settingsQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: settings, error: null });
          return Promise.resolve({ data: settings, error: null });
        },
      });

      const insertQueryBuilder = createMockQueryBuilder([transaction]);
      insertQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: transaction, error: null });
          return Promise.resolve({ data: transaction, error: null });
        },
      });

      const updateQueryBuilder = createMockQueryBuilder([]);

      mockSupabaseClient.from
        .mockReturnValueOnce(balanceQueryBuilder)
        .mockReturnValueOnce(settingsQueryBuilder)
        .mockReturnValueOnce(insertQueryBuilder)
        .mockReturnValueOnce(updateQueryBuilder);

      const result = await pointService.earnPoints(
        testData.companyId,
        testData.customerId,
        100,
        'sale-001',
        '購入ポイント'
      );

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('point_transactions');
    });
  });

  describe('usePoints', () => {
    it('ポイントを使用できる', async () => {
      const customer = { points_balance: 500 };
      const transaction = { id: 'trans-001', points: -100, balance_after: 400 };

      const balanceQueryBuilder = createMockQueryBuilder([customer]);
      balanceQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: customer, error: null });
          return Promise.resolve({ data: customer, error: null });
        },
      });

      const insertQueryBuilder = createMockQueryBuilder([transaction]);
      insertQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: transaction, error: null });
          return Promise.resolve({ data: transaction, error: null });
        },
      });

      const updateQueryBuilder = createMockQueryBuilder([]);

      mockSupabaseClient.from
        .mockReturnValueOnce(balanceQueryBuilder)
        .mockReturnValueOnce(insertQueryBuilder)
        .mockReturnValueOnce(updateQueryBuilder);

      const result = await pointService.usePoints(
        testData.companyId,
        testData.customerId,
        100,
        'sale-001',
        'ポイント利用'
      );

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('point_transactions');
    });
  });

  describe('adjustPoints', () => {
    it('ポイントを調整できる', async () => {
      const customer = { points_balance: 500 };
      const transaction = { id: 'trans-001', points: 50, balance_after: 550 };

      const balanceQueryBuilder = createMockQueryBuilder([customer]);
      balanceQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: customer, error: null });
          return Promise.resolve({ data: customer, error: null });
        },
      });

      const insertQueryBuilder = createMockQueryBuilder([transaction]);
      insertQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: transaction, error: null });
          return Promise.resolve({ data: transaction, error: null });
        },
      });

      const updateQueryBuilder = createMockQueryBuilder([]);

      mockSupabaseClient.from
        .mockReturnValueOnce(balanceQueryBuilder)
        .mockReturnValueOnce(insertQueryBuilder)
        .mockReturnValueOnce(updateQueryBuilder);

      const result = await pointService.adjustPoints(
        testData.companyId,
        testData.customerId,
        50,
        'キャンペーンボーナス'
      );

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('point_transactions');
    });
  });

  describe('getExpiringPoints', () => {
    it('期限切れ間近のポイントを取得できる', async () => {
      const expiringPoints = [
        { customer_id: 'customer-001', expiring_points: 100, expires_at: '2024-02-01T23:59:59Z' },
      ];

      const queryBuilder = createMockQueryBuilder(expiringPoints);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await pointService.getExpiringPoints(testData.companyId, 30);

      expect(result).toHaveLength(1);
    });
  });
});

// =================================
// tagService Tests
// =================================
describe('tagService: タグサービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getAll', () => {
    it('全タグを取得できる', async () => {
      const tags = [
        { id: 'tag-001', name: 'VIP', color: '#FFD700', entity_type: 'customer' },
        { id: 'tag-002', name: '新規', color: '#00FF00', entity_type: 'customer' },
      ];

      const queryBuilder = createMockQueryBuilder(tags);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await tagService.getAll(testData.companyId);

      expect(result).toHaveLength(2);
    });
  });

  describe('getById', () => {
    it('タグ詳細を取得できる', async () => {
      const tag = {
        id: testData.tagId,
        name: 'VIP',
        color: '#FFD700',
        entity_type: 'customer',
      };

      const queryBuilder = createMockQueryBuilder([tag]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: tag, error: null });
          return Promise.resolve({ data: tag, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await tagService.getById(testData.tagId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tags');
    });
  });

  describe('getByEntityType', () => {
    it('エンティティタイプ別にタグを取得できる', async () => {
      const customerTags = [
        { id: 'tag-001', name: 'VIP', entity_type: 'customer' },
      ];

      const queryBuilder = createMockQueryBuilder(customerTags);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await tagService.getByEntityType(testData.companyId, 'customer');

      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('タグを作成できる', async () => {
      const newTag = {
        id: 'tag-003',
        company_id: testData.companyId,
        name: '常連',
        color: '#0000FF',
        applicable_to: ['customer'],
      };

      const queryBuilder = createMockQueryBuilder([newTag]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: newTag, error: null });
          return Promise.resolve({ data: newTag, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await tagService.create({
        company_id: testData.companyId,
        name: '常連',
        color: '#0000FF',
        applicable_to: ['customer'],
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tags');
    });
  });

  describe('update', () => {
    it('タグを更新できる', async () => {
      const updatedTag = {
        id: testData.tagId,
        name: 'VVIP',
        color: '#FFD700',
      };

      const queryBuilder = createMockQueryBuilder([updatedTag]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: updatedTag, error: null });
          return Promise.resolve({ data: updatedTag, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await tagService.update(testData.tagId, { name: 'VVIP' });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tags');
    });
  });

  describe('delete', () => {
    it('タグを削除できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(tagService.delete(testData.tagId)).resolves.not.toThrow();
    });
  });

  describe('assignTag', () => {
    it('エンティティにタグを割り当てできる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(
        tagService.assignTag(testData.tagId, 'customer', testData.customerId)
      ).resolves.not.toThrow();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tag_items');
    });
  });

  describe('removeTag', () => {
    it('エンティティからタグを削除できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(
        tagService.removeTag(testData.tagId, 'customer', testData.customerId)
      ).resolves.not.toThrow();
    });
  });

  describe('getEntityTags', () => {
    it('エンティティのタグを取得できる', async () => {
      const tags = [
        { tag: { id: 'tag-001', name: 'VIP', color: '#FFD700' } },
      ];

      const queryBuilder = createMockQueryBuilder(tags);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await tagService.getEntityTags('customer', testData.customerId);

      expect(result).toHaveLength(1);
    });
  });

  describe('getEntitiesByTag', () => {
    it('タグを持つエンティティを取得できる', async () => {
      const entities = [
        { entity_id: 'customer-001' },
        { entity_id: 'customer-002' },
      ];

      const queryBuilder = createMockQueryBuilder(entities);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await tagService.getEntitiesByTag(testData.tagId, 'customer');

      expect(result).toHaveLength(2);
    });
  });

  describe('setEntityTags', () => {
    it('エンティティのタグを一括設定できる', async () => {
      const deleteQueryBuilder = createMockQueryBuilder([]);
      const insertQueryBuilder = createMockQueryBuilder([]);

      mockSupabaseClient.from
        .mockReturnValueOnce(deleteQueryBuilder)
        .mockReturnValueOnce(insertQueryBuilder);

      await expect(
        tagService.setEntityTags('customer', testData.customerId, ['tag-001', 'tag-002'])
      ).resolves.not.toThrow();
    });
  });

  describe('searchByTags', () => {
    it('タグでエンティティを検索できる', async () => {
      const entities = [
        { entity_id: 'customer-001' },
      ];

      const queryBuilder = createMockQueryBuilder(entities);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await tagService.searchByTags(testData.companyId, 'customer', ['tag-001', 'tag-002']);

      expect(result).toHaveLength(1);
    });
  });
});
