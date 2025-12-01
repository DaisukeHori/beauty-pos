/**
 * コアサービス（認証・会社・店舗・スタッフ）の統合テスト
 */

import { authService } from '../../services/authService';
import { companyService } from '../../services/companyService';
import { storeService } from '../../services/storeService';
import { staffService } from '../../services/staffService';
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
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    getUser: jest.fn(),
    refreshSession: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/image.jpg' } }),
    }),
  },
};

// Test data
const testData = {
  companyId: 'company-001',
  storeId: 'store-001',
  staffId: 'staff-001',
  userId: 'user-001',
};

describe('authService: 認証サービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('signUp', () => {
    it('新規ユーザー登録が正常に動作する', async () => {
      const mockCompany = { id: testData.companyId, name: 'テスト美容室' };
      const mockStaff = { id: testData.staffId, role: 'owner' };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: testData.userId }, session: {} },
        error: null,
      });

      const companyQueryBuilder = createMockQueryBuilder([mockCompany]);
      companyQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: mockCompany, error: null });
          return Promise.resolve({ data: mockCompany, error: null });
        },
      });

      const staffQueryBuilder = createMockQueryBuilder([mockStaff]);
      staffQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: mockStaff, error: null });
          return Promise.resolve({ data: mockStaff, error: null });
        },
      });

      mockSupabaseClient.from
        .mockReturnValueOnce(companyQueryBuilder)
        .mockReturnValueOnce(staffQueryBuilder);

      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'password123',
        companyName: 'テスト美容室',
        firstName: '太郎',
        lastName: '田中',
      });

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalled();
    });

    it('重複メールでエラーが発生する', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('User already registered'),
      });

      await expect(
        authService.signUp({
          email: 'duplicate@example.com',
          password: 'password123',
          companyName: 'テスト美容室',
          firstName: '太郎',
          lastName: '田中',
        })
      ).rejects.toThrow();
    });
  });

  describe('signIn', () => {
    it('ログインが正常に動作する', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: testData.userId }, session: { access_token: 'token' } },
        error: null,
      });

      const staffQueryBuilder = createMockQueryBuilder([{ id: testData.staffId }]);
      staffQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: { id: testData.staffId }, error: null });
          return Promise.resolve({ data: { id: testData.staffId }, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(staffQueryBuilder);

      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalled();
    });

    it('不正なパスワードでエラーが発生する', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('Invalid login credentials'),
      });

      await expect(
        authService.signIn({
          email: 'test@example.com',
          password: 'wrong_password',
        })
      ).rejects.toThrow();
    });
  });

  describe('signOut', () => {
    it('ログアウトが正常に動作する', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      await expect(authService.signOut()).resolves.not.toThrow();
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('セッション情報を取得できる', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token', user: { id: testData.userId } } },
        error: null,
      });

      const session = await authService.getSession();
      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('現在のユーザー情報を取得できる', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: testData.userId, email: 'test@example.com' } },
        error: null,
      });

      const user = await authService.getCurrentUser();
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('パスワードリセットメールを送信できる', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

      await expect(authService.resetPassword('test@example.com')).resolves.not.toThrow();
      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalled();
    });
  });

  describe('updatePassword', () => {
    it('パスワードを更新できる', async () => {
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: { id: testData.userId } },
        error: null,
      });

      await expect(authService.updatePassword('newPassword123')).resolves.not.toThrow();
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({ password: 'newPassword123' });
    });
  });
});

describe('companyService: 会社サービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getById', () => {
    it('会社情報を取得できる', async () => {
      const company = {
        id: testData.companyId,
        name: 'テスト美容室',
        email: 'contact@test.com',
        phone: '03-1234-5678',
      };

      const queryBuilder = createMockQueryBuilder([company]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: company, error: null });
          return Promise.resolve({ data: company, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await companyService.getById(testData.companyId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('companies');
    });
  });

  describe('update', () => {
    it('会社情報を更新できる', async () => {
      const updatedCompany = {
        id: testData.companyId,
        name: '更新後の美容室名',
        email: 'updated@test.com',
      };

      const queryBuilder = createMockQueryBuilder([updatedCompany]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: updatedCompany, error: null });
          return Promise.resolve({ data: updatedCompany, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await companyService.update(testData.companyId, {
        name: '更新後の美容室名',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('companies');
    });
  });

  describe('updateSettings', () => {
    it('会社設定を更新できる', async () => {
      const queryBuilder = createMockQueryBuilder([{}]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(
        companyService.updateSettings(testData.companyId, {
          timezone: 'Asia/Tokyo',
          locale: 'ja',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('getSubscriptionStatus', () => {
    it('サブスクリプション状態を取得できる', async () => {
      const status = {
        plan: 'professional',
        status: 'active',
        current_period_end: '2024-12-31T23:59:59Z',
      };

      const queryBuilder = createMockQueryBuilder([status]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: status, error: null });
          return Promise.resolve({ data: status, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await companyService.getSubscriptionStatus(testData.companyId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('subscriptions');
    });
  });
});

describe('storeService: 店舗サービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getAll', () => {
    it('全店舗を取得できる', async () => {
      const stores = [
        { id: 'store-001', name: '本店', is_active: true },
        { id: 'store-002', name: '支店', is_active: true },
      ];

      const queryBuilder = createMockQueryBuilder(stores);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await storeService.getAll(testData.companyId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('stores');
      expect(result).toHaveLength(2);
    });
  });

  describe('getById', () => {
    it('店舗詳細を取得できる', async () => {
      const store = {
        id: testData.storeId,
        name: '本店',
        address: '東京都渋谷区1-2-3',
        phone: '03-1234-5678',
        business_hours: {
          monday: { open: '10:00', close: '20:00', is_closed: false },
        },
      };

      const queryBuilder = createMockQueryBuilder([store]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: store, error: null });
          return Promise.resolve({ data: store, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await storeService.getById(testData.storeId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('stores');
    });
  });

  describe('getActive', () => {
    it('有効な店舗のみを取得できる', async () => {
      const activeStores = [
        { id: 'store-001', name: '本店', is_active: true },
      ];

      const queryBuilder = createMockQueryBuilder(activeStores);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await storeService.getActive(testData.companyId);

      expect(result).toHaveLength(1);
      expect(result[0].is_active).toBe(true);
    });
  });

  describe('create', () => {
    it('新規店舗を作成できる', async () => {
      const newStore = {
        id: 'store-003',
        company_id: testData.companyId,
        name: '新店舗',
        address: '東京都新宿区',
      };

      const queryBuilder = createMockQueryBuilder([newStore]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: newStore, error: null });
          return Promise.resolve({ data: newStore, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await storeService.create({
        company_id: testData.companyId,
        name: '新店舗',
        address: '東京都新宿区',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('stores');
    });
  });

  describe('update', () => {
    it('店舗情報を更新できる', async () => {
      const updatedStore = {
        id: testData.storeId,
        name: '更新後の店舗名',
      };

      const queryBuilder = createMockQueryBuilder([updatedStore]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: updatedStore, error: null });
          return Promise.resolve({ data: updatedStore, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await storeService.update(testData.storeId, {
        name: '更新後の店舗名',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('stores');
    });
  });

  describe('delete', () => {
    it('店舗を論理削除できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(storeService.delete(testData.storeId)).resolves.not.toThrow();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('stores');
    });
  });

  describe('updateBusinessHours', () => {
    it('営業時間を更新できる', async () => {
      const businessHours = {
        monday: { open: '10:00', close: '20:00', is_closed: false },
        tuesday: { open: '10:00', close: '20:00', is_closed: false },
        wednesday: { open: '10:00', close: '20:00', is_closed: false },
        thursday: { open: '10:00', close: '20:00', is_closed: false },
        friday: { open: '10:00', close: '20:00', is_closed: false },
        saturday: { open: '10:00', close: '18:00', is_closed: false },
        sunday: { open: '10:00', close: '18:00', is_closed: true },
      };

      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(
        storeService.updateBusinessHours(testData.storeId, businessHours)
      ).resolves.not.toThrow();
    });
  });

  describe('updateHolidays', () => {
    it('定休日を更新できる', async () => {
      const holidays = ['2024-01-01', '2024-01-02', '2024-01-03'];

      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(
        storeService.updateHolidays(testData.storeId, holidays)
      ).resolves.not.toThrow();
    });
  });
});

describe('staffService: スタッフサービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getAll', () => {
    it('全スタッフを取得できる', async () => {
      const staffList = [
        { id: 'staff-001', first_name: '太郎', last_name: '田中', is_active: true },
        { id: 'staff-002', first_name: '花子', last_name: '鈴木', is_active: true },
      ];

      const queryBuilder = createMockQueryBuilder(staffList);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await staffService.getAll(testData.companyId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('staff');
      expect(result).toHaveLength(2);
    });
  });

  describe('getActive', () => {
    it('有効なスタッフのみを取得できる', async () => {
      const activeStaff = [
        { id: 'staff-001', first_name: '太郎', last_name: '田中', is_active: true },
      ];

      const queryBuilder = createMockQueryBuilder(activeStaff);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await staffService.getActive(testData.companyId);

      expect(result).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('スタッフ詳細を取得できる', async () => {
      const staff = {
        id: testData.staffId,
        first_name: '太郎',
        last_name: '田中',
        email: 'taro@example.com',
        role: 'stylist',
      };

      const queryBuilder = createMockQueryBuilder([staff]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: staff, error: null });
          return Promise.resolve({ data: staff, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await staffService.getById(testData.staffId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('staff');
    });
  });

  describe('getByStore', () => {
    it('店舗に紐づくスタッフを取得できる', async () => {
      const storeStaff = [
        { id: 'staff-001', first_name: '太郎', last_name: '田中' },
      ];

      const queryBuilder = createMockQueryBuilder(storeStaff);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await staffService.getByStore(testData.storeId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('staff_stores');
    });
  });

  describe('create', () => {
    it('新規スタッフを作成できる', async () => {
      const newStaff = {
        id: 'staff-003',
        company_id: testData.companyId,
        employee_code: 'EMP003',
        first_name: '新人',
        last_name: '山田',
        email: 'new@example.com',
        role: 'assistant',
      };

      const queryBuilder = createMockQueryBuilder([newStaff]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: newStaff, error: null });
          return Promise.resolve({ data: newStaff, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await staffService.create({
        company_id: testData.companyId,
        employee_code: 'EMP003',
        first_name: '新人',
        last_name: '山田',
        email: 'new@example.com',
        role: 'assistant',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('staff');
    });
  });

  describe('update', () => {
    it('スタッフ情報を更新できる', async () => {
      const updatedStaff = {
        id: testData.staffId,
        first_name: '太郎',
        last_name: '田中',
        role: 'senior_stylist',
      };

      const queryBuilder = createMockQueryBuilder([updatedStaff]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: updatedStaff, error: null });
          return Promise.resolve({ data: updatedStaff, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await staffService.update(testData.staffId, {
        role: 'senior_stylist',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('staff');
    });
  });

  describe('delete', () => {
    it('スタッフを論理削除できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(staffService.delete(testData.staffId)).resolves.not.toThrow();
    });
  });

  describe('assignToStore', () => {
    it('スタッフを店舗に配属できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(
        staffService.assignToStore(testData.staffId, testData.storeId)
      ).resolves.not.toThrow();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('staff_stores');
    });
  });

  describe('removeFromStore', () => {
    it('スタッフを店舗から削除できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(
        staffService.removeFromStore(testData.staffId, testData.storeId)
      ).resolves.not.toThrow();
    });
  });

  describe('updateNominationFee', () => {
    it('指名料を更新できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(
        staffService.updateNominationFee(testData.staffId, 500)
      ).resolves.not.toThrow();
    });
  });

  describe('generateEmployeeCode', () => {
    it('従業員コードを生成できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const code = await staffService.generateEmployeeCode(testData.companyId);

      expect(typeof code).toBe('string');
    });
  });
});
