/**
 * レポーティングサービス（通知・日報・会員ランク・印刷）の統合テスト
 */

import { notificationService } from '../../services/notificationService';
import { dailyReportService } from '../../services/dailyReportService';
import { memberRankService } from '../../services/memberRankService';
import { printService } from '../../services/printService';
import { staffPerformanceService } from '../../services/staffPerformanceService';
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
  notificationId: 'notification-001',
};

// =================================
// notificationService Tests
// =================================
describe('notificationService: 通知サービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('create', () => {
    it('通知を作成できる', async () => {
      const notification = {
        id: testData.notificationId,
        company_id: testData.companyId,
        type: 'system',
        channel: 'in_app',
        title: 'お知らせ',
        body: 'テストメッセージ',
      };

      const queryBuilder = createMockQueryBuilder([notification]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: notification, error: null });
          return Promise.resolve({ data: notification, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await notificationService.create({
        company_id: testData.companyId,
        type: 'system',
        channel: 'in_app',
        title: 'お知らせ',
        body: 'テストメッセージ',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('notifications');
    });
  });

  describe('createBulk', () => {
    it('複数通知を一括作成できる', async () => {
      const notifications = [
        { id: 'notif-001', title: '通知1' },
        { id: 'notif-002', title: '通知2' },
      ];

      const queryBuilder = createMockQueryBuilder(notifications);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await notificationService.createBulk([
        { company_id: testData.companyId, type: 'system', channel: 'in_app', title: '通知1', body: 'メッセージ1' },
        { company_id: testData.companyId, type: 'system', channel: 'in_app', title: '通知2', body: 'メッセージ2' },
      ]);

      expect(result).toHaveLength(2);
    });
  });

  describe('getForStaff', () => {
    it('スタッフへの通知を取得できる', async () => {
      const notifications = [
        { id: 'notif-001', title: 'シフト確認', is_read: false },
      ];

      const queryBuilder = createMockQueryBuilder(notifications);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await notificationService.getForStaff(testData.staffId);

      expect(result).toHaveLength(1);
    });
  });

  describe('getForCustomer', () => {
    it('顧客への通知を取得できる', async () => {
      const notifications = [
        { id: 'notif-001', title: '予約確認', is_read: false },
      ];

      const queryBuilder = createMockQueryBuilder(notifications);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await notificationService.getForCustomer(testData.customerId);

      expect(result).toHaveLength(1);
    });
  });

  describe('getUnreadCount', () => {
    it('未読通知数を取得できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ count: 5, error: null });
          return Promise.resolve({ count: 5, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const count = await notificationService.getUnreadCount(testData.staffId);

      expect(typeof count).toBe('number');
    });
  });

  describe('markAsRead', () => {
    it('通知を既読にできる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(
        notificationService.markAsRead(testData.notificationId)
      ).resolves.not.toThrow();
    });
  });

  describe('markAllAsRead', () => {
    it('全通知を既読にできる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(
        notificationService.markAllAsRead(testData.staffId)
      ).resolves.not.toThrow();
    });
  });

  describe('sendReservationConfirmation', () => {
    it('予約確認通知を送信できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(
        notificationService.sendReservationConfirmation(
          testData.companyId,
          testData.storeId,
          testData.customerId,
          {
            date: '2024-01-20',
            time: '14:00',
            staffName: '田中',
            menuName: 'カット',
            storeName: '本店',
          }
        )
      ).resolves.not.toThrow();
    });
  });

  describe('sendReservationReminder', () => {
    it('予約リマインダーを送信できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(
        notificationService.sendReservationReminder(
          testData.companyId,
          testData.storeId,
          testData.customerId,
          {
            date: '2024-01-21',
            time: '14:00',
            staffName: '田中',
            storeName: '本店',
          }
        )
      ).resolves.not.toThrow();
    });
  });
});

// =================================
// dailyReportService Tests
// =================================
describe('dailyReportService: 日報サービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getByDate', () => {
    it('日付指定で日報を取得できる', async () => {
      const report = {
        id: 'report-001',
        store_id: testData.storeId,
        date: '2024-01-15',
        total_sales: 150000,
        customer_count: 15,
        status: 'closed',
      };

      const queryBuilder = createMockQueryBuilder([report]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: report, error: null });
          return Promise.resolve({ data: report, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await dailyReportService.getByDate(testData.companyId, testData.storeId, '2024-01-15');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('daily_reports');
    });
  });

  describe('getRange', () => {
    it('期間指定で日報を取得できる', async () => {
      const reports = [
        { id: 'report-001', date: '2024-01-15', total_sales: 150000 },
        { id: 'report-002', date: '2024-01-16', total_sales: 180000 },
      ];

      const queryBuilder = createMockQueryBuilder(reports);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await dailyReportService.getRange(
        testData.companyId,
        testData.storeId,
        '2024-01-15',
        '2024-01-21'
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('getMonthly', () => {
    it('月次日報一覧を取得できる', async () => {
      const reports = [
        { id: 'report-001', report_date: '2024-01-15', total_sales: 150000, total_customers: 15 },
        { id: 'report-002', report_date: '2024-01-16', total_sales: 180000, total_customers: 18 },
      ];

      const queryBuilder = createMockQueryBuilder(reports);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await dailyReportService.getMonthly(testData.companyId, testData.storeId, 2024, 1);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('total_sales');
    });
  });

  describe('generate', () => {
    it('日報を生成できる', async () => {
      const report = {
        id: 'report-001',
        company_id: testData.companyId,
        store_id: testData.storeId,
        report_date: '2024-01-15',
        total_sales: 80000,
        total_customers: 10,
      };

      const queryBuilder = createMockQueryBuilder([report]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: report, error: null });
          return Promise.resolve({ data: report, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);
      (mockSupabaseClient as Record<string, unknown>).functions = {
        invoke: jest.fn().mockResolvedValue({ data: report, error: null }),
      };

      // Note: generate calls functions.invoke then getByDate
      const result = await dailyReportService.generate(testData.companyId, testData.storeId, '2024-01-15');

      expect(result).toHaveProperty('total_sales');
    });
  });

  describe('close', () => {
    it('日報を締めることができる', async () => {
      const closedReport = {
        id: 'report-001',
        is_closed: true,
        closed_by: testData.staffId,
      };

      const queryBuilder = createMockQueryBuilder([closedReport]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: closedReport, error: null });
          return Promise.resolve({ data: closedReport, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await dailyReportService.close('report-001', testData.staffId);

      expect(result).toHaveProperty('is_closed');
    });
  });
});

// =================================
// memberRankService Tests
// =================================
describe('memberRankService: 会員ランクサービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getRanks', () => {
    it('会員ランク一覧を取得できる', async () => {
      const ranks = [
        { id: 'rank-001', name: 'ブロンズ', min_spend: 0 },
        { id: 'rank-002', name: 'シルバー', min_spend: 50000 },
        { id: 'rank-003', name: 'ゴールド', min_spend: 100000 },
      ];

      const queryBuilder = createMockQueryBuilder(ranks);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await memberRankService.getRanks(testData.companyId);

      expect(result).toHaveLength(3);
    });
  });

  describe('getDefaultRanks', () => {
    it('デフォルトランクを取得できる', () => {
      const ranks = memberRankService.getDefaultRanks(testData.companyId);

      expect(ranks.length).toBeGreaterThan(0);
      expect(ranks[0]).toHaveProperty('name');
      expect(ranks[0]).toHaveProperty('minSpend');
    });
  });

  describe('getConfig', () => {
    it('会員ランク設定を取得できる', async () => {
      const config = {
        enabled: true,
        calculation_period_months: 12,
        use_total_spend: true,
      };

      const queryBuilder = createMockQueryBuilder([config]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: config, error: null });
          return Promise.resolve({ data: config, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await memberRankService.getConfig(testData.companyId);

      expect(result).toHaveProperty('calculationBasis');
    });
  });

  describe('saveConfig', () => {
    it('会員ランク設定を保存できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(
        memberRankService.saveConfig({
          companyId: testData.companyId,
          calculationBasis: 'spend',
          calculationPeriodMonths: 12,
          autoDowngrade: false,
          downgradeGracePeriodDays: 30,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('getCustomerRankInfo', () => {
    it('顧客のランク情報を取得できる', async () => {
      const config = { calculation_basis: 'spend', calculation_period_months: 12 };
      const ranks = [
        { id: 'rank-001', name: 'シルバー', level: 2, min_spend: 50000, is_default: false },
      ];
      const customer = {
        id: testData.customerId,
        member_rank_id: 'rank-001',
        points_balance: 1000,
      };
      const sales = [{ total: 75000 }];
      const history: never[] = [];

      const configQueryBuilder = createMockQueryBuilder([config]);
      configQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: config, error: null });
          return Promise.resolve({ data: config, error: null });
        },
      });

      const ranksQueryBuilder = createMockQueryBuilder(ranks);
      const customerQueryBuilder = createMockQueryBuilder([customer]);
      customerQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: customer, error: null });
          return Promise.resolve({ data: customer, error: null });
        },
      });

      const salesQueryBuilder = createMockQueryBuilder(sales);
      const visitsQueryBuilder = createMockQueryBuilder([]);
      const historyQueryBuilder = createMockQueryBuilder(history);

      mockSupabaseClient.from
        .mockReturnValueOnce(configQueryBuilder)
        .mockReturnValueOnce(ranksQueryBuilder)
        .mockReturnValueOnce(customerQueryBuilder)
        .mockReturnValueOnce(salesQueryBuilder)
        .mockReturnValueOnce(visitsQueryBuilder)
        .mockReturnValueOnce(customerQueryBuilder)
        .mockReturnValueOnce(historyQueryBuilder);

      const result = await memberRankService.getCustomerRankInfo(testData.companyId, testData.customerId);

      expect(result).toHaveProperty('currentRank');
    });
  });

  describe('calculateCustomerStats', () => {
    it('顧客の利用統計を計算できる', async () => {
      const sales = [
        { total: 30000 },
        { total: 25000 },
      ];
      const customer = { points_balance: 500 };

      const salesQueryBuilder = createMockQueryBuilder(sales);
      const visitsQueryBuilder = createMockQueryBuilder([]);
      const customerQueryBuilder = createMockQueryBuilder([customer]);
      customerQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: customer, error: null });
          return Promise.resolve({ data: customer, error: null });
        },
      });

      mockSupabaseClient.from
        .mockReturnValueOnce(salesQueryBuilder)
        .mockReturnValueOnce(visitsQueryBuilder)
        .mockReturnValueOnce(customerQueryBuilder);

      const stats = await memberRankService.calculateCustomerStats(testData.companyId, testData.customerId, 12);

      expect(stats).toHaveProperty('totalSpend');
      expect(stats).toHaveProperty('totalVisits');
    });
  });

  describe('determineRank', () => {
    it('利用額からランクを決定できる', () => {
      const ranks = [
        { id: '1', companyId: testData.companyId, name: 'レギュラー', level: 1, color: '#ccc', minSpend: 0, pointMultiplier: 1, discountPercentage: 0, benefits: [], isDefault: true },
        { id: '2', companyId: testData.companyId, name: 'シルバー', level: 2, color: '#silver', minSpend: 50000, pointMultiplier: 1.5, discountPercentage: 3, benefits: [], isDefault: false },
        { id: '3', companyId: testData.companyId, name: 'ゴールド', level: 3, color: '#gold', minSpend: 100000, pointMultiplier: 2, discountPercentage: 5, benefits: [], isDefault: false },
      ];
      const stats = { totalSpend: 75000, totalVisits: 10, totalPoints: 1000 };

      const rank = memberRankService.determineRank(ranks, stats, 'spend');

      expect(rank.name).toBe('シルバー');
    });
  });

  describe('getCustomerDiscount', () => {
    it('顧客のランク割引を取得できる', async () => {
      // getCustomerDiscount calls getCustomerRankInfo internally
      const config = { calculation_basis: 'spend', calculation_period_months: 12 };
      const ranks = [
        { id: 'rank-001', name: 'ゴールド', level: 3, min_spend: 100000, discount_percentage: 5, is_default: false },
      ];
      const customer = {
        id: testData.customerId,
        member_rank_id: 'rank-001',
        points_balance: 1000,
      };

      const configQueryBuilder = createMockQueryBuilder([config]);
      configQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: config, error: null });
          return Promise.resolve({ data: config, error: null });
        },
      });

      const ranksQueryBuilder = createMockQueryBuilder(ranks);
      const customerQueryBuilder = createMockQueryBuilder([customer]);
      customerQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: customer, error: null });
          return Promise.resolve({ data: customer, error: null });
        },
      });

      const salesQueryBuilder = createMockQueryBuilder([]);
      const visitsQueryBuilder = createMockQueryBuilder([]);
      const historyQueryBuilder = createMockQueryBuilder([]);

      mockSupabaseClient.from
        .mockReturnValueOnce(configQueryBuilder)
        .mockReturnValueOnce(ranksQueryBuilder)
        .mockReturnValueOnce(customerQueryBuilder)
        .mockReturnValueOnce(salesQueryBuilder)
        .mockReturnValueOnce(visitsQueryBuilder)
        .mockReturnValueOnce(customerQueryBuilder)
        .mockReturnValueOnce(historyQueryBuilder);

      const discount = await memberRankService.getCustomerDiscount(testData.companyId, testData.customerId);

      expect(typeof discount).toBe('number');
    });
  });

  describe('getPointMultiplier', () => {
    it('ランクのポイント倍率を取得できる', async () => {
      // Similar to getCustomerDiscount, this calls getCustomerRankInfo
      const config = { calculation_basis: 'spend', calculation_period_months: 12 };
      const ranks = [
        { id: 'rank-001', name: 'ゴールド', level: 3, min_spend: 100000, point_multiplier: 2.0, is_default: false },
      ];
      const customer = {
        id: testData.customerId,
        member_rank_id: 'rank-001',
        points_balance: 1000,
      };

      const configQueryBuilder = createMockQueryBuilder([config]);
      configQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: config, error: null });
          return Promise.resolve({ data: config, error: null });
        },
      });

      const ranksQueryBuilder = createMockQueryBuilder(ranks);
      const customerQueryBuilder = createMockQueryBuilder([customer]);
      customerQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: customer, error: null });
          return Promise.resolve({ data: customer, error: null });
        },
      });

      const salesQueryBuilder = createMockQueryBuilder([]);
      const visitsQueryBuilder = createMockQueryBuilder([]);
      const historyQueryBuilder = createMockQueryBuilder([]);

      mockSupabaseClient.from
        .mockReturnValueOnce(configQueryBuilder)
        .mockReturnValueOnce(ranksQueryBuilder)
        .mockReturnValueOnce(customerQueryBuilder)
        .mockReturnValueOnce(salesQueryBuilder)
        .mockReturnValueOnce(visitsQueryBuilder)
        .mockReturnValueOnce(customerQueryBuilder)
        .mockReturnValueOnce(historyQueryBuilder);

      const multiplier = await memberRankService.getPointMultiplier(testData.companyId, testData.customerId);

      expect(typeof multiplier).toBe('number');
    });
  });
});

// =================================
// printService Tests
// =================================
describe('printService: 印刷サービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('generateReceiptHtml', () => {
    it('レシートHTMLを生成できる', () => {
      const receiptData = {
        saleId: 'sale-001',
        saleNumber: 'SALE-001',
        saleDate: '2024-01-15T14:00:00Z',
        storeName: '本店',
        storeAddress: '東京都渋谷区1-2-3',
        storePhone: '03-1234-5678',
        items: [
          { name: 'カット', quantity: 1, unitPrice: 4000, subtotal: 4000, taxRate: 10 },
        ],
        subtotal: 4000,
        discountTotal: 0,
        discounts: [],
        tax10Amount: 364,
        tax8Amount: 0,
        total: 4400,
        payments: [{ method: 'cash', amount: 5000 }],
        paidAmount: 5000,
        change: 600,
        pointsUsed: 0,
        pointsEarned: 40,
      };

      const html = printService.generateReceiptHtml(receiptData);

      expect(typeof html).toBe('string');
      expect(html).toContain('本店');
    });
  });

  describe('createPrintJob', () => {
    it('印刷ジョブを作成できる', async () => {
      const printJob = {
        id: 'job-001',
        company_id: testData.companyId,
        store_id: testData.storeId,
        printer_id: 'printer-001',
        job_type: 'receipt',
        status: 'pending',
      };

      const queryBuilder = createMockQueryBuilder([printJob]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: printJob, error: null });
          return Promise.resolve({ data: printJob, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await printService.createPrintJob(
        testData.companyId,
        testData.storeId,
        'receipt',
        { content: '<html></html>' },
        'printer-001'
      );

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('print_jobs');
    });
  });

  describe('getPendingJobs', () => {
    it('保留中の印刷ジョブを取得できる', async () => {
      const jobs = [
        { id: 'job-001', status: 'pending' },
        { id: 'job-002', status: 'pending' },
      ];

      const queryBuilder = createMockQueryBuilder(jobs);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await printService.getPendingJobs(testData.storeId);

      expect(result).toHaveLength(2);
    });
  });

  describe('updateJobStatus', () => {
    it('印刷ジョブのステータスを更新できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(
        printService.updateJobStatus('job-001', 'completed')
      ).resolves.not.toThrow();
    });
  });

  describe('getPrinters', () => {
    it('プリンター一覧を取得できる', async () => {
      const printers = [
        { id: 'printer-001', name: 'レシートプリンター', type: 'receipt' },
      ];

      const queryBuilder = createMockQueryBuilder(printers);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await printService.getPrinters(testData.storeId);

      expect(result).toHaveLength(1);
    });
  });

  describe('getDefaultPrinter', () => {
    it('デフォルトプリンターを取得できる', async () => {
      const printer = { id: 'printer-001', name: 'レシートプリンター', is_default: true };

      const queryBuilder = createMockQueryBuilder([printer]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: printer, error: null });
          return Promise.resolve({ data: printer, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await printService.getDefaultPrinter(testData.storeId);

      expect(result).toHaveProperty('is_default', true);
    });
  });

  describe('buildReceiptData', () => {
    it('レシートデータを構築できる', async () => {
      const sale = {
        id: 'sale-001',
        sale_number: 'SALE-001',
        total: 4400,
        subtotal: 4000,
        tax: 400,
        sale_date: '2024-01-15T14:00:00Z',
        items: [{ name: 'カット', price: 4000, quantity: 1 }],
        store: { name: '本店', address: '東京都渋谷区', phone: '03-1234-5678' },
      };

      const queryBuilder = createMockQueryBuilder([sale]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: sale, error: null });
          return Promise.resolve({ data: sale, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await printService.buildReceiptData('sale-001');

      expect(result).toHaveProperty('saleNumber');
      expect(result).toHaveProperty('items');
    });
  });
});

// =================================
// staffPerformanceService Tests
// =================================
describe('staffPerformanceService: スタッフ実績サービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getPerformance', () => {
    it('スタッフ実績を取得できる', async () => {
      const staffStores = [
        { staff: { id: 'staff-001', first_name: '太郎', last_name: '田中', avatar_url: null } },
      ];
      const salesData = [
        { subtotal: 10000, nomination_fee: 500, item_type: 'menu', sale: { customer_id: 'cust-001' } },
      ];

      const staffQueryBuilder = createMockQueryBuilder(staffStores);
      const salesQueryBuilder = createMockQueryBuilder(salesData);

      mockSupabaseClient.from
        .mockReturnValueOnce(staffQueryBuilder)
        .mockReturnValueOnce(salesQueryBuilder);

      const result = await staffPerformanceService.getPerformance(
        testData.storeId,
        '2024-01-01',
        '2024-01-31'
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getSalesRanking', () => {
    it('売上ランキングを取得できる', async () => {
      const staffStores = [
        { staff: { id: 'staff-001', first_name: '太郎', last_name: '田中' } },
        { staff: { id: 'staff-002', first_name: '花子', last_name: '鈴木' } },
      ];
      const salesData1 = [{ subtotal: 100000, nomination_fee: 0, item_type: 'menu' }];
      const salesData2 = [{ subtotal: 80000, nomination_fee: 0, item_type: 'menu' }];

      mockSupabaseClient.from
        .mockReturnValueOnce(createMockQueryBuilder(staffStores))
        .mockReturnValueOnce(createMockQueryBuilder(salesData1))
        .mockReturnValueOnce(createMockQueryBuilder(salesData2));

      const result = await staffPerformanceService.getSalesRanking(
        testData.storeId,
        '2024-01-01',
        '2024-01-31',
        10
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getNominationRanking', () => {
    it('指名ランキングを取得できる', async () => {
      const staffStores = [
        { staff: { id: 'staff-001', first_name: '太郎', last_name: '田中' } },
      ];
      const salesData = [
        { subtotal: 10000, nomination_fee: 500, item_type: 'menu' },
        { subtotal: 10000, nomination_fee: 500, item_type: 'menu' },
      ];

      mockSupabaseClient.from
        .mockReturnValueOnce(createMockQueryBuilder(staffStores))
        .mockReturnValueOnce(createMockQueryBuilder(salesData));

      const result = await staffPerformanceService.getNominationRanking(
        testData.storeId,
        '2024-01-01',
        '2024-01-31'
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getMonthlySummary', () => {
    it('月次サマリーを取得できる', async () => {
      const salesData = [
        { subtotal: 50000, nomination_fee: 1000, created_at: '2024-01-15T10:00:00Z' },
        { subtotal: 30000, nomination_fee: 500, created_at: '2024-01-16T11:00:00Z' },
      ];

      const queryBuilder = createMockQueryBuilder(salesData);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await staffPerformanceService.getMonthlySummary(
        testData.staffId,
        2024,
        1
      );

      expect(result).toHaveProperty('totalSales');
      expect(result).toHaveProperty('saleCount');
      expect(result).toHaveProperty('nominationCount');
    });
  });

  describe('calculateIncentive', () => {
    it('インセンティブを計算できる', async () => {
      const salesData = [
        { subtotal: 50000, nomination_fee: 1000, item_type: 'menu' },
        { subtotal: 10000, nomination_fee: 0, item_type: 'product' },
      ];

      const queryBuilder = createMockQueryBuilder(salesData);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await staffPerformanceService.calculateIncentive(
        testData.staffId,
        '2024-01-01',
        '2024-01-31'
      );

      expect(result).toHaveProperty('totalIncentive');
      expect(result).toHaveProperty('salesIncentive');
      expect(result).toHaveProperty('nominationIncentive');
      expect(result).toHaveProperty('productIncentive');
    });
  });

  describe('getDailyPerformance', () => {
    it('日次実績を取得できる', async () => {
      const sales = [
        {
          id: 'sale-001',
          total: 10000,
          customer_id: 'cust-001',
          sale_date: '2024-01-15T14:00:00Z',
          items: [{ subtotal: 10000, staff_id: 'staff-001', staff: { first_name: '太郎', last_name: '田中' } }],
        },
      ];

      const queryBuilder = createMockQueryBuilder(sales);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await staffPerformanceService.getDailyPerformance(
        testData.storeId,
        '2024-01-15'
      );

      expect(result).toHaveProperty('totalSales');
      expect(result).toHaveProperty('customerCount');
      expect(result).toHaveProperty('hourlyBreakdown');
    });
  });
});
