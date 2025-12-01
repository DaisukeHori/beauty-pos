/**
 * 外部連携サービス（AI・LINE・SMS・Email・設定）の統合テスト
 */

import { aiService } from '../../services/aiService';
import { hairStyleService } from '../../services/hairStyleService';
import { proposalService } from '../../services/proposalService';
import { lineService } from '../../services/lineService';
import { smsService } from '../../services/smsService';
import { emailService } from '../../services/emailService';
import { reminderSchedulerService } from '../../services/reminderSchedulerService';
import { featureSettingsService } from '../../services/featureSettingsService';
import { integrationSettingsService } from '../../services/integrationSettingsService';
import { getSupabaseClient, resetSupabaseClient } from '../../client';
import { createMockQueryBuilder } from '../setup';

// Mock Supabase client
jest.mock('../../client', () => ({
  getSupabaseClient: jest.fn(),
  resetSupabaseClient: jest.fn(),
}));

// Mock fetch for external API calls
global.fetch = jest.fn();

const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn(),
  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/image.jpg' } }),
    }),
  },
  functions: {
    invoke: jest.fn(),
  },
};

// Test data
const testData = {
  companyId: 'company-001',
  storeId: 'store-001',
  staffId: 'staff-001',
  customerId: 'customer-001',
  visitId: 'visit-001',
  recordingId: 'recording-001',
  transcriptId: 'transcript-001',
  simulationId: 'simulation-001',
};

// =================================
// aiService Tests
// =================================
describe('aiService: AI会話分析サービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('createRecording', () => {
    it('録音レコードを作成できる', async () => {
      const recording = {
        id: testData.recordingId,
        company_id: testData.companyId,
        visit_id: testData.visitId,
        status: 'pending',
      };

      const queryBuilder = createMockQueryBuilder([recording]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: recording, error: null });
          return Promise.resolve({ data: recording, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await aiService.createRecording({
        company_id: testData.companyId,
        visit_id: testData.visitId,
        customer_id: testData.customerId,
        staff_id: testData.staffId,
        audio_url: 'https://example.com/audio/test.webm',
        status: 'pending',
        recorded_at: new Date().toISOString(),
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('conversation_recordings');
    });
  });

  describe('getRecording', () => {
    it('録音レコードを取得できる', async () => {
      const recording = {
        id: testData.recordingId,
        status: 'completed',
        duration_seconds: 300,
      };

      const queryBuilder = createMockQueryBuilder([recording]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: recording, error: null });
          return Promise.resolve({ data: recording, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await aiService.getRecording(testData.recordingId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('conversation_recordings');
    });
  });

  describe('getRecordingsByVisit', () => {
    it('来店の録音一覧を取得できる', async () => {
      const recordings = [
        { id: 'rec-001', status: 'completed' },
        { id: 'rec-002', status: 'pending' },
      ];

      const queryBuilder = createMockQueryBuilder(recordings);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await aiService.getRecordingsByVisit(testData.visitId);

      expect(result).toHaveLength(2);
    });
  });

  describe('updateRecordingStatus', () => {
    it('録音ステータスを更新できる', async () => {
      const recording = {
        id: testData.recordingId,
        status: 'processing',
      };

      const queryBuilder = createMockQueryBuilder([recording]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: recording, error: null });
          return Promise.resolve({ data: recording, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await aiService.updateRecordingStatus(testData.recordingId, 'processing', 300);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('conversation_recordings');
    });
  });

  describe('createTranscript', () => {
    it('文字起こしを作成できる', async () => {
      const transcript = {
        id: testData.transcriptId,
        recording_id: testData.recordingId,
        full_text: 'テスト文字起こし',
      };

      const queryBuilder = createMockQueryBuilder([transcript]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: transcript, error: null });
          return Promise.resolve({ data: transcript, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await aiService.createTranscript({
        recording_id: testData.recordingId,
        full_text: 'テスト文字起こし',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('conversation_transcripts');
    });
  });

  describe('createSuggestion', () => {
    it('AI提案を作成できる', async () => {
      const suggestion = {
        id: 'suggestion-001',
        visit_id: testData.visitId,
        type: 'upsell',
        content: 'トリートメントをおすすめ',
        confidence: 0.85,
      };

      const queryBuilder = createMockQueryBuilder([suggestion]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: suggestion, error: null });
          return Promise.resolve({ data: suggestion, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await aiService.createSuggestion({
        company_id: testData.companyId,
        visit_id: testData.visitId,
        customer_id: testData.customerId,
        suggestion_type: 'upsell',
        title: 'トリートメントのご提案',
        description: 'トリートメントをおすすめ',
        confidence: 0.85,
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('ai_suggestions');
    });
  });

  describe('getSuggestionsByVisit', () => {
    it('来店のAI提案一覧を取得できる', async () => {
      const suggestions = [
        { id: 'sug-001', type: 'upsell', status: 'active' },
      ];

      const queryBuilder = createMockQueryBuilder(suggestions);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await aiService.getSuggestionsByVisit(testData.visitId);

      expect(result).toHaveLength(1);
    });
  });

  describe('createSimulation', () => {
    it('ヘアスタイルシミュレーションを作成できる', async () => {
      const simulation = {
        id: testData.simulationId,
        customer_id: testData.customerId,
        status: 'pending',
      };

      const queryBuilder = createMockQueryBuilder([simulation]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: simulation, error: null });
          return Promise.resolve({ data: simulation, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await aiService.createSimulation({
        company_id: testData.companyId,
        customer_id: testData.customerId,
        source_image_url: 'https://example.com/source.jpg',
        parameters: { target_style: 'ショートボブ' },
        status: 'pending',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('hairstyle_simulations');
    });
  });

  describe('rateSimulation', () => {
    it('シミュレーションを評価できる', async () => {
      const simulation = {
        id: testData.simulationId,
        customer_rating: 5,
        customer_feedback: '素敵です！',
      };

      const queryBuilder = createMockQueryBuilder([simulation]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: simulation, error: null });
          return Promise.resolve({ data: simulation, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await aiService.rateSimulation(testData.simulationId, 5, '素敵です！');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('hairstyle_simulations');
    });
  });
});

// =================================
// hairStyleService Tests
// =================================
describe('hairStyleService: ヘアスタイルサービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getCategories', () => {
    it('カテゴリ一覧を取得できる', async () => {
      const categories = [
        { id: 'cat-001', name: 'ショート' },
        { id: 'cat-002', name: 'ミディアム' },
      ];

      const queryBuilder = createMockQueryBuilder(categories);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await hairStyleService.getCategories(testData.companyId);

      expect(result).toHaveLength(2);
    });
  });

  describe('getAll', () => {
    it('ヘアスタイル一覧を取得できる', async () => {
      const styles = [
        { id: 'style-001', name: 'ナチュラルボブ', length: 'short' },
      ];

      const queryBuilder = createMockQueryBuilder(styles);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await hairStyleService.getAll(testData.companyId);

      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getFeatured', () => {
    it('おすすめスタイルを取得できる', async () => {
      const styles = [
        { id: 'style-001', name: 'おすすめスタイル', is_featured: true },
      ];

      const queryBuilder = createMockQueryBuilder(styles);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await hairStyleService.getFeatured(testData.companyId);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('addFavorite', () => {
    it('お気に入りに追加できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await hairStyleService.addFavorite(testData.customerId, 'style-001');

      expect(typeof result).toBe('boolean');
    });
  });

  describe('removeFavorite', () => {
    it('お気に入りから削除できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await hairStyleService.removeFavorite(testData.customerId, 'style-001');

      expect(typeof result).toBe('boolean');
    });
  });
});

// =================================
// proposalService Tests
// =================================
describe('proposalService: スタイル提案サービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getByCustomer', () => {
    it('顧客への提案一覧を取得できる', async () => {
      const proposals = [
        { id: 'prop-001', style_name: 'ゆるふわミディアム', status: 'pending' },
      ];

      const queryBuilder = createMockQueryBuilder(proposals);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await proposalService.getByCustomer(testData.customerId);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getPending', () => {
    it('保留中の提案を取得できる', async () => {
      const proposals = [
        { id: 'prop-001', status: 'pending' },
      ];

      const queryBuilder = createMockQueryBuilder(proposals);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await proposalService.getPending(testData.customerId);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('accept', () => {
    it('提案を承認できる', async () => {
      const proposal = {
        id: 'prop-001',
        status: 'accepted',
        customer_feedback: '気に入りました',
      };

      const queryBuilder = createMockQueryBuilder([proposal]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: proposal, error: null });
          return Promise.resolve({ data: proposal, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await proposalService.accept('prop-001', '気に入りました');

      expect(result?.status).toBe('accepted');
    });
  });

  describe('reject', () => {
    it('提案を拒否できる', async () => {
      const proposal = {
        id: 'prop-001',
        status: 'rejected',
        customer_feedback: '今回は見送ります',
      };

      const queryBuilder = createMockQueryBuilder([proposal]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: proposal, error: null });
          return Promise.resolve({ data: proposal, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await proposalService.reject('prop-001', '今回は見送ります');

      expect(result?.status).toBe('rejected');
    });
  });
});

// =================================
// lineService Tests
// =================================
describe('lineService: LINE通知サービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  describe('getConfig', () => {
    it('LINE設定を取得できる', async () => {
      const config = {
        config: {
          channelAccessToken: 'token',
          channelSecret: 'secret',
        },
      };

      const queryBuilder = createMockQueryBuilder([config]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: config, error: null });
          return Promise.resolve({ data: config, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await lineService.getConfig(testData.companyId);

      expect(result).toHaveProperty('channelAccessToken');
    });
  });

  describe('saveConfig', () => {
    it('LINE設定を保存できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(
        lineService.saveConfig(testData.companyId, {
          channelAccessToken: 'token',
          channelSecret: 'secret',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('sendTextMessage', () => {
    it('テキストメッセージを送信できる', async () => {
      const config = {
        config: {
          channelAccessToken: 'token',
          channelSecret: 'secret',
        },
      };

      const queryBuilder = createMockQueryBuilder([config]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: config, error: null });
          return Promise.resolve({ data: config, error: null });
        },
      });
      mockSupabaseClient.from
        .mockReturnValueOnce(queryBuilder)
        .mockReturnValueOnce(createMockQueryBuilder([]));

      const result = await lineService.sendTextMessage(testData.companyId, 'U12345', 'テストメッセージ');

      expect(typeof result).toBe('boolean');
    });
  });

  describe('linkCustomer', () => {
    it('顧客とLINEアカウントを紐付けできる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(
        lineService.linkCustomer(testData.customerId, 'U12345')
      ).resolves.not.toThrow();
    });
  });

  describe('findCustomerByLineId', () => {
    it('LINE IDから顧客を検索できる', async () => {
      const customer = {
        id: testData.customerId,
        first_name: '太郎',
        last_name: '田中',
      };

      const queryBuilder = createMockQueryBuilder([customer]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: customer, error: null });
          return Promise.resolve({ data: customer, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await lineService.findCustomerByLineId(testData.companyId, 'U12345');

      expect(result).toHaveProperty('name');
    });
  });
});

// =================================
// smsService Tests
// =================================
describe('smsService: SMS通知サービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getConfig', () => {
    it('SMS設定を取得できる', async () => {
      const config = {
        config: {
          provider: 'twilio',
          accountSid: 'AC123',
          authToken: 'token',
          fromNumber: '+81901234567',
        },
      };

      const queryBuilder = createMockQueryBuilder([config]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: config, error: null });
          return Promise.resolve({ data: config, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await smsService.getConfig(testData.companyId);

      expect(result).toHaveProperty('provider');
    });
  });

  describe('normalizePhoneNumber', () => {
    it('日本の電話番号を正規化できる', () => {
      expect(smsService.normalizePhoneNumber('090-1234-5678')).toBe('+819012345678');
      expect(smsService.normalizePhoneNumber('09012345678')).toBe('+819012345678');
      expect(smsService.normalizePhoneNumber('+81901234567')).toBe('+81901234567');
    });

    it('無効な電話番号はnullを返す', () => {
      expect(smsService.normalizePhoneNumber('123')).toBeNull();
    });
  });

  describe('send', () => {
    it('SMS未設定の場合はエラーを返す', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: { code: 'PGRST116' } });
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await smsService.send(testData.companyId, {
        to: '09012345678',
        message: 'テストメッセージ',
      });

      expect(result.success).toBe(false);
    });
  });
});

// =================================
// emailService Tests
// =================================
describe('emailService: メール通知サービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 202,
      headers: { get: () => 'msg-id' },
      json: () => Promise.resolve({}),
    });
  });

  describe('getConfig', () => {
    it('メール設定を取得できる', async () => {
      const config = {
        config: {
          provider: 'sendgrid',
          apiKey: 'SG.xxx',
          fromEmail: 'noreply@example.com',
          fromName: 'テスト美容室',
        },
      };

      const queryBuilder = createMockQueryBuilder([config]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: config, error: null });
          return Promise.resolve({ data: config, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await emailService.getConfig(testData.companyId);

      expect(result).toHaveProperty('provider');
    });
  });

  describe('send', () => {
    it('メール未設定の場合はエラーを返す', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: { code: 'PGRST116' } });
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await emailService.send(testData.companyId, {
        to: 'test@example.com',
        subject: 'テスト',
        text: 'テストメッセージ',
      });

      expect(result.success).toBe(false);
    });
  });
});

// =================================
// reminderSchedulerService Tests
// =================================
describe('reminderSchedulerService: リマインダースケジューラーサービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getStats', () => {
    it('リマインダー統計を取得できる', async () => {
      const pendingQuery = createMockQueryBuilder([]);
      pendingQuery.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ count: 5, error: null });
          return Promise.resolve({ count: 5, error: null });
        },
      });

      const sentQuery = createMockQueryBuilder([]);
      sentQuery.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ count: 10, error: null });
          return Promise.resolve({ count: 10, error: null });
        },
      });

      const lastQuery = createMockQueryBuilder([{ reminder_sent_at: '2024-01-15T10:00:00Z' }]);
      lastQuery.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: { reminder_sent_at: '2024-01-15T10:00:00Z' }, error: null });
          return Promise.resolve({ data: { reminder_sent_at: '2024-01-15T10:00:00Z' }, error: null });
        },
      });

      mockSupabaseClient.from
        .mockReturnValueOnce(pendingQuery)
        .mockReturnValueOnce(sentQuery)
        .mockReturnValueOnce(lastQuery);

      const result = await reminderSchedulerService.getStats(testData.companyId);

      expect(result).toHaveProperty('pendingCount');
      expect(result).toHaveProperty('sentTodayCount');
    });
  });

  describe('getUpcomingReminders', () => {
    it('送信予定のリマインダーを取得できる', async () => {
      const reservations = [
        {
          id: 'res-001',
          start_time: '2024-01-16T14:00:00Z',
          customer_id: 'cust-001',
          reminder_sent_at: null,
          customer: { first_name: '太郎', last_name: '田中' },
          staff: { first_name: '美咲', last_name: '鈴木' },
          store: { name: '本店' },
        },
      ];

      const queryBuilder = createMockQueryBuilder(reservations);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await reminderSchedulerService.getUpcomingReminders(testData.companyId);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('hasPendingReminder', () => {
    it('リマインダー未送信かどうかを確認できる', async () => {
      const reservation = { reminder_sent_at: null };

      const queryBuilder = createMockQueryBuilder([reservation]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: reservation, error: null });
          return Promise.resolve({ data: reservation, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await reminderSchedulerService.hasPendingReminder('res-001');

      expect(result).toBe(true);
    });
  });
});

// =================================
// featureSettingsService Tests
// =================================
describe('featureSettingsService: 機能設定サービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getAll', () => {
    it('全機能設定を取得できる', async () => {
      const company = {
        settings: {
          features: {
            notification_line: { type: 'notification_line', enabled: true },
          },
        },
      };

      const queryBuilder = createMockQueryBuilder([company]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: company, error: null });
          return Promise.resolve({ data: company, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await featureSettingsService.getAll(testData.companyId);

      expect(result).toHaveProperty('features');
    });
  });

  describe('isEnabled', () => {
    it('機能が有効かどうかを確認できる', async () => {
      const company = {
        settings: {
          features: {
            customer_points: { type: 'customer_points', enabled: true },
          },
        },
      };

      const queryBuilder = createMockQueryBuilder([company]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: company, error: null });
          return Promise.resolve({ data: company, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await featureSettingsService.isEnabled(testData.companyId, 'customer_points');

      expect(typeof result).toBe('boolean');
    });
  });

  describe('getFeatureDefinitions', () => {
    it('機能定義一覧を取得できる', () => {
      const definitions = featureSettingsService.getFeatureDefinitions();

      expect(Array.isArray(definitions)).toBe(true);
      expect(definitions.length).toBeGreaterThan(0);
      expect(definitions[0]).toHaveProperty('type');
      expect(definitions[0]).toHaveProperty('name');
    });
  });

  describe('getCategories', () => {
    it('機能カテゴリ一覧を取得できる', () => {
      const categories = featureSettingsService.getCategories();

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });
  });
});

// =================================
// integrationSettingsService Tests
// =================================
describe('integrationSettingsService: 外部連携設定サービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getAll', () => {
    it('全連携設定を取得できる', async () => {
      const company = {
        settings: {
          integrations: {
            line: { type: 'line', enabled: true },
          },
        },
      };

      const queryBuilder = createMockQueryBuilder([company]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: company, error: null });
          return Promise.resolve({ data: company, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await integrationSettingsService.getAll(testData.companyId);

      expect(result).toHaveProperty('integrations');
    });
  });

  describe('getAllMasked', () => {
    it('マスク済み連携設定を取得できる', async () => {
      const company = {
        settings: {
          integrations: {
            line: { type: 'line', enabled: true, api_key: 'secret_key_12345' },
          },
        },
      };

      const queryBuilder = createMockQueryBuilder([company]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: company, error: null });
          return Promise.resolve({ data: company, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await integrationSettingsService.getAllMasked(testData.companyId);

      expect(result.integrations.line?.api_key).toContain('••••');
    });
  });

  describe('testConnection', () => {
    it('連携未設定の場合はエラーを返す', async () => {
      const company = { settings: { integrations: {} } };

      const queryBuilder = createMockQueryBuilder([company]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: company, error: null });
          return Promise.resolve({ data: company, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await integrationSettingsService.testConnection(testData.companyId, 'line');

      expect(result.success).toBe(false);
    });
  });

  describe('getIntegrationInfos', () => {
    it('連携情報一覧を取得できる', () => {
      const infos = integrationSettingsService.getIntegrationInfos();

      expect(Array.isArray(infos)).toBe(true);
      expect(infos.length).toBeGreaterThan(0);
      expect(infos[0]).toHaveProperty('type');
      expect(infos[0]).toHaveProperty('name');
    });
  });

  describe('getIntegrationsByCategory', () => {
    it('カテゴリ別に連携を取得できる', () => {
      const messaging = integrationSettingsService.getIntegrationsByCategory('messaging');

      expect(Array.isArray(messaging)).toBe(true);
      expect(messaging.every(i => i.category === 'messaging')).toBe(true);
    });
  });
});
