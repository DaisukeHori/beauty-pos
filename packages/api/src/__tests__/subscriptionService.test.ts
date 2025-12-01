import { subscriptionService } from '../services/subscriptionService';
import { mockSupabaseClient, createMockQueryBuilder } from './setup';

describe('subscriptionService', () => {
  describe('getPlans', () => {
    it('should return all subscription plans', () => {
      const plans = subscriptionService.getPlans();

      expect(plans).toHaveLength(4);
      expect(plans.map(p => p.id)).toEqual(['free', 'starter', 'professional', 'enterprise']);
    });

    it('should have correct pricing for each plan', () => {
      const plans = subscriptionService.getPlans();

      const free = plans.find(p => p.id === 'free')!;
      expect(free.priceMonthly).toBe(0);
      expect(free.priceYearly).toBe(0);

      const starter = plans.find(p => p.id === 'starter')!;
      expect(starter.priceMonthly).toBe(4980);
      expect(starter.priceYearly).toBe(49800);

      const professional = plans.find(p => p.id === 'professional')!;
      expect(professional.priceMonthly).toBe(9980);
      expect(professional.priceYearly).toBe(99800);

      const enterprise = plans.find(p => p.id === 'enterprise')!;
      expect(enterprise.priceMonthly).toBe(29800);
      expect(enterprise.priceYearly).toBe(298000);
    });
  });

  describe('getPlan', () => {
    it('should return specific plan by ID', () => {
      const plan = subscriptionService.getPlan('professional');

      expect(plan).toBeDefined();
      expect(plan!.name).toBe('プロフェッショナルプラン');
      expect(plan!.limits.aiFeatures).toBe(true);
    });

    it('should return undefined for invalid plan ID', () => {
      const plan = subscriptionService.getPlan('invalid' as any);

      expect(plan).toBeUndefined();
    });
  });

  describe('plan limits', () => {
    it('should have correct limits for free plan', () => {
      const plan = subscriptionService.getPlan('free')!;

      expect(plan.limits.maxStaff).toBe(2);
      expect(plan.limits.maxStores).toBe(1);
      expect(plan.limits.maxCustomers).toBe(100);
      expect(plan.limits.maxReservationsPerMonth).toBe(50);
      expect(plan.limits.aiFeatures).toBe(false);
      expect(plan.limits.prioritySupport).toBe(false);
      expect(plan.limits.customBranding).toBe(false);
      expect(plan.limits.apiAccess).toBe(false);
    });

    it('should have correct limits for starter plan', () => {
      const plan = subscriptionService.getPlan('starter')!;

      expect(plan.limits.maxStaff).toBe(5);
      expect(plan.limits.maxStores).toBe(1);
      expect(plan.limits.maxCustomers).toBe(1000);
      expect(plan.limits.maxReservationsPerMonth).toBe(500);
      expect(plan.limits.aiFeatures).toBe(false);
    });

    it('should have correct limits for professional plan', () => {
      const plan = subscriptionService.getPlan('professional')!;

      expect(plan.limits.maxStaff).toBe(20);
      expect(plan.limits.maxStores).toBe(3);
      expect(plan.limits.maxCustomers).toBe(-1); // unlimited
      expect(plan.limits.maxReservationsPerMonth).toBe(-1); // unlimited
      expect(plan.limits.aiFeatures).toBe(true);
      expect(plan.limits.prioritySupport).toBe(true);
    });

    it('should have unlimited limits for enterprise plan', () => {
      const plan = subscriptionService.getPlan('enterprise')!;

      expect(plan.limits.maxStaff).toBe(-1);
      expect(plan.limits.maxStores).toBe(-1);
      expect(plan.limits.maxCustomers).toBe(-1);
      expect(plan.limits.maxReservationsPerMonth).toBe(-1);
      expect(plan.limits.aiFeatures).toBe(true);
      expect(plan.limits.customBranding).toBe(true);
      expect(plan.limits.apiAccess).toBe(true);
    });
  });

  describe('getSubscription', () => {
    it('should return subscription for company', async () => {
      const mockSubscription = {
        id: 'sub-1',
        company_id: 'company-1',
        plan: 'professional',
        status: 'active',
        billing_cycle: 'monthly',
        current_period_start: '2024-01-01T00:00:00Z',
        current_period_end: '2024-02-01T00:00:00Z',
        cancel_at_period_end: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const queryBuilder = createMockQueryBuilder([mockSubscription]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: mockSubscription, error: null });
          return Promise.resolve({ data: mockSubscription, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await subscriptionService.getSubscription('company-1');

      expect(result).toEqual(mockSubscription);
    });

    it('should return default free subscription when none exists', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: null, error: { message: 'Not found' } });
          return Promise.resolve({ data: null, error: { message: 'Not found' } });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await subscriptionService.getSubscription('company-1');

      expect(result).toBeDefined();
      expect(result!.plan).toBe('free');
      expect(result!.status).toBe('active');
    });
  });

  describe('calculateProratedAmount', () => {
    it('should calculate upgrade proration', () => {
      // Upgrading from starter (4980/month) to professional (9980/month)
      // With 15 days remaining out of 30
      const amount = subscriptionService.calculateProratedAmount(
        'starter',
        'professional',
        'monthly',
        15,
        30
      );

      // Daily rate difference: (9980 - 4980) / 30 = 166.67
      // Prorated: 166.67 * 15 = 2500
      expect(amount).toBeGreaterThan(0);
      expect(amount).toBe(2500);
    });

    it('should return 0 for downgrade', () => {
      // Downgrading from professional to starter
      const amount = subscriptionService.calculateProratedAmount(
        'professional',
        'starter',
        'monthly',
        15,
        30
      );

      // User gets credit, so charge is 0
      expect(amount).toBe(0);
    });

    it('should calculate yearly proration', () => {
      const amount = subscriptionService.calculateProratedAmount(
        'starter',
        'professional',
        'yearly',
        180,
        365
      );

      // (99800 - 49800) / 365 * 180 = 24657
      expect(amount).toBeGreaterThan(0);
    });
  });

  describe('plan features', () => {
    it('free plan should include basic features', () => {
      const plan = subscriptionService.getPlan('free')!;

      expect(plan.features).toContain('予約管理（月50件まで）');
      expect(plan.features).toContain('顧客管理（100名まで）');
      expect(plan.features).toContain('基本的な売上レポート');
    });

    it('professional plan should include AI features', () => {
      const plan = subscriptionService.getPlan('professional')!;

      expect(plan.features).toContain('AIヘアスタイル提案');
      expect(plan.features).toContain('AI顧客分析');
    });

    it('enterprise plan should include all features', () => {
      const plan = subscriptionService.getPlan('enterprise')!;

      expect(plan.features).toContain('全機能利用可能');
      expect(plan.features).toContain('API連携');
      expect(plan.features).toContain('カスタム開発対応');
    });
  });
});
