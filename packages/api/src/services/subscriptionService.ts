import { getSupabaseClient } from '../client';

// Subscription plan types
export type PlanType = 'free' | 'starter' | 'professional' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused';

export interface SubscriptionPlan {
  id: PlanType;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: {
    maxStaff: number;
    maxStores: number;
    maxCustomers: number;
    maxReservationsPerMonth: number;
    aiFeatures: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
    apiAccess: boolean;
  };
}

export interface Subscription {
  id: string;
  company_id: string;
  plan: PlanType;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  trial_end?: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface BillingInfo {
  id: string;
  company_id: string;
  company_name: string;
  email: string;
  phone?: string;
  postal_code?: string;
  address?: string;
  tax_id?: string;
  stripe_customer_id?: string;
  default_payment_method_id?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  isDefault: boolean;
}

export interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  period_start: string;
  period_end: string;
  paid_at?: string;
  pdf_url?: string;
  created_at: string;
}

// Plan definitions
const planDefinitions: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'フリープラン',
    description: '小規模サロン向けの無料プラン',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      '予約管理（月50件まで）',
      '顧客管理（100名まで）',
      '基本的な売上レポート',
      'メール通知',
    ],
    limits: {
      maxStaff: 2,
      maxStores: 1,
      maxCustomers: 100,
      maxReservationsPerMonth: 50,
      aiFeatures: false,
      prioritySupport: false,
      customBranding: false,
      apiAccess: false,
    },
  },
  {
    id: 'starter',
    name: 'スタータープラン',
    description: '成長中のサロン向け',
    priceMonthly: 4980,
    priceYearly: 49800, // 2ヶ月分無料
    features: [
      '予約管理（月500件まで）',
      '顧客管理（1,000名まで）',
      '詳細な売上レポート',
      'LINE/SMS通知',
      'クーポン・回数券',
      'ポイント機能',
    ],
    limits: {
      maxStaff: 5,
      maxStores: 1,
      maxCustomers: 1000,
      maxReservationsPerMonth: 500,
      aiFeatures: false,
      prioritySupport: false,
      customBranding: false,
      apiAccess: false,
    },
  },
  {
    id: 'professional',
    name: 'プロフェッショナルプラン',
    description: '本格的なサロン運営向け',
    priceMonthly: 9980,
    priceYearly: 99800, // 2ヶ月分無料
    features: [
      '予約管理（無制限）',
      '顧客管理（無制限）',
      '高度な分析レポート',
      'LINE/SMS/メール通知',
      'クーポン・回数券',
      'ポイント・会員ランク',
      'AIヘアスタイル提案',
      'AI顧客分析',
      'ホットペッパー連携',
    ],
    limits: {
      maxStaff: 20,
      maxStores: 3,
      maxCustomers: -1, // unlimited
      maxReservationsPerMonth: -1, // unlimited
      aiFeatures: true,
      prioritySupport: true,
      customBranding: false,
      apiAccess: false,
    },
  },
  {
    id: 'enterprise',
    name: 'エンタープライズプラン',
    description: '複数店舗展開向け',
    priceMonthly: 29800,
    priceYearly: 298000, // 2ヶ月分無料
    features: [
      '全機能利用可能',
      '無制限のスタッフ・顧客・予約',
      '複数店舗管理',
      'カスタムブランディング',
      'API連携',
      '専任サポート担当',
      'オンボーディング支援',
      'カスタム開発対応',
    ],
    limits: {
      maxStaff: -1, // unlimited
      maxStores: -1, // unlimited
      maxCustomers: -1, // unlimited
      maxReservationsPerMonth: -1, // unlimited
      aiFeatures: true,
      prioritySupport: true,
      customBranding: true,
      apiAccess: true,
    },
  },
];

export const subscriptionService = {
  /**
   * Get all available plans
   */
  getPlans(): SubscriptionPlan[] {
    return planDefinitions;
  },

  /**
   * Get a specific plan
   */
  getPlan(planId: PlanType): SubscriptionPlan | undefined {
    return planDefinitions.find(p => p.id === planId);
  },

  /**
   * Get current subscription for a company
   */
  async getSubscription(companyId: string): Promise<Subscription | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (error || !data) {
      // Return a default free plan subscription if none exists
      return {
        id: 'default',
        company_id: companyId,
        plan: 'free',
        status: 'active',
        billing_cycle: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    return data as Subscription;
  },

  /**
   * Get billing information for a company
   */
  async getBillingInfo(companyId: string): Promise<BillingInfo | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('companies')
      .select('id, name, email, phone, settings')
      .eq('id', companyId)
      .single() as { data: { id: string; name: string; email?: string; phone?: string; settings?: Record<string, unknown> } | null; error: unknown };

    if (error || !data) return null;

    const settings = (data.settings as Record<string, unknown>) || {};
    const billing = (settings.billing as Record<string, unknown>) || {};

    return {
      id: data.id,
      company_id: data.id,
      company_name: data.name,
      email: data.email || '',
      phone: data.phone || '',
      postal_code: billing.postal_code as string | undefined,
      address: billing.address as string | undefined,
      tax_id: billing.tax_id as string | undefined,
      stripe_customer_id: billing.stripe_customer_id as string | undefined,
      default_payment_method_id: billing.default_payment_method_id as string | undefined,
    };
  },

  /**
   * Update billing information
   */
  async updateBillingInfo(
    companyId: string,
    billingInfo: Partial<BillingInfo>
  ): Promise<void> {
    const supabase = getSupabaseClient();

    // Get current settings
    const { data: current } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single() as { data: { settings?: Record<string, unknown> } | null; error: unknown };

    const settings = (current?.settings as Record<string, unknown>) || {};
    const billing = (settings.billing as Record<string, unknown>) || {};

    const updatedBilling = {
      ...billing,
      postal_code: billingInfo.postal_code,
      address: billingInfo.address,
      tax_id: billingInfo.tax_id,
    };

    const { error } = await (supabase
      .from('companies') as ReturnType<typeof supabase.from>)
      .update({
        email: billingInfo.email,
        phone: billingInfo.phone,
        settings: { ...settings, billing: updatedBilling },
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('id', companyId);

    if (error) throw error;
  },

  /**
   * Create checkout session for subscription
   */
  async createCheckoutSession(
    companyId: string,
    planId: PlanType,
    billingCycle: BillingCycle
  ): Promise<{ url: string; sessionId: string }> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
      body: {
        companyId,
        planId,
        billingCycle,
      },
    });

    if (error) throw new Error(error.message);
    if (data.error) throw new Error(data.error);

    return {
      url: data.url,
      sessionId: data.sessionId,
    };
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    companyId: string,
    cancelImmediately: boolean = false
  ): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase.functions.invoke('cancel-subscription', {
      body: {
        companyId,
        cancelImmediately,
      },
    });

    if (error) throw new Error(error.message);

    // Update local subscription record
    await (supabase
      .from('subscriptions') as ReturnType<typeof supabase.from>)
      .update({
        cancel_at_period_end: !cancelImmediately,
        status: cancelImmediately ? 'canceled' : 'active',
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('company_id', companyId);
  },

  /**
   * Resume a canceled subscription
   */
  async resumeSubscription(companyId: string): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase.functions.invoke('resume-subscription', {
      body: { companyId },
    });

    if (error) throw new Error(error.message);

    // Update local subscription record
    await (supabase
      .from('subscriptions') as ReturnType<typeof supabase.from>)
      .update({
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('company_id', companyId);
  },

  /**
   * Change subscription plan
   */
  async changePlan(
    companyId: string,
    newPlanId: PlanType,
    billingCycle?: BillingCycle
  ): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase.functions.invoke('change-subscription-plan', {
      body: {
        companyId,
        planId: newPlanId,
        billingCycle,
      },
    });

    if (error) throw new Error(error.message);
  },

  /**
   * Get payment methods for a company
   */
  async getPaymentMethods(companyId: string): Promise<PaymentMethod[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.functions.invoke('get-payment-methods', {
      body: { companyId },
    });

    if (error) return [];

    return data.paymentMethods || [];
  },

  /**
   * Add a payment method
   */
  async addPaymentMethod(
    companyId: string,
    paymentMethodId: string
  ): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase.functions.invoke('add-payment-method', {
      body: {
        companyId,
        paymentMethodId,
      },
    });

    if (error) throw new Error(error.message);
  },

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(
    companyId: string,
    paymentMethodId: string
  ): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase.functions.invoke('set-default-payment-method', {
      body: {
        companyId,
        paymentMethodId,
      },
    });

    if (error) throw new Error(error.message);
  },

  /**
   * Remove a payment method
   */
  async removePaymentMethod(
    companyId: string,
    paymentMethodId: string
  ): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase.functions.invoke('remove-payment-method', {
      body: {
        companyId,
        paymentMethodId,
      },
    });

    if (error) throw new Error(error.message);
  },

  /**
   * Get invoice history
   */
  async getInvoices(companyId: string, limit: number = 12): Promise<Invoice[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.functions.invoke('get-invoices', {
      body: {
        companyId,
        limit,
      },
    });

    if (error) return [];

    return data.invoices || [];
  },

  /**
   * Check if company is within plan limits
   */
  async checkPlanLimits(companyId: string): Promise<{
    withinLimits: boolean;
    usage: {
      staff: { current: number; limit: number };
      stores: { current: number; limit: number };
      customers: { current: number; limit: number };
      reservationsThisMonth: { current: number; limit: number };
    };
    warnings: string[];
  }> {
    const supabase = getSupabaseClient();

    // Get subscription
    const subscription = await this.getSubscription(companyId);
    const plan = this.getPlan(subscription?.plan || 'free');

    if (!plan) {
      return {
        withinLimits: false,
        usage: {
          staff: { current: 0, limit: 0 },
          stores: { current: 0, limit: 0 },
          customers: { current: 0, limit: 0 },
          reservationsThisMonth: { current: 0, limit: 0 },
        },
        warnings: ['プラン情報が取得できません'],
      };
    }

    // Get current usage
    const [staffResult, storesResult, customersResult, reservationsResult] = await Promise.all([
      supabase.from('staff').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('stores').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('reservations').select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ]);

    const usage = {
      staff: {
        current: staffResult.count || 0,
        limit: plan.limits.maxStaff,
      },
      stores: {
        current: storesResult.count || 0,
        limit: plan.limits.maxStores,
      },
      customers: {
        current: customersResult.count || 0,
        limit: plan.limits.maxCustomers,
      },
      reservationsThisMonth: {
        current: reservationsResult.count || 0,
        limit: plan.limits.maxReservationsPerMonth,
      },
    };

    const warnings: string[] = [];
    let withinLimits = true;

    // Check each limit
    if (plan.limits.maxStaff > 0 && usage.staff.current >= plan.limits.maxStaff) {
      warnings.push(`スタッフ数が上限（${plan.limits.maxStaff}名）に達しています`);
      withinLimits = false;
    }
    if (plan.limits.maxStores > 0 && usage.stores.current >= plan.limits.maxStores) {
      warnings.push(`店舗数が上限（${plan.limits.maxStores}店舗）に達しています`);
      withinLimits = false;
    }
    if (plan.limits.maxCustomers > 0 && usage.customers.current >= plan.limits.maxCustomers) {
      warnings.push(`顧客数が上限（${plan.limits.maxCustomers}名）に達しています`);
      withinLimits = false;
    }
    if (plan.limits.maxReservationsPerMonth > 0 && usage.reservationsThisMonth.current >= plan.limits.maxReservationsPerMonth) {
      warnings.push(`今月の予約数が上限（${plan.limits.maxReservationsPerMonth}件）に達しています`);
      withinLimits = false;
    }

    return {
      withinLimits,
      usage,
      warnings,
    };
  },

  /**
   * Check if a specific feature is available in the current plan
   */
  async isFeatureAvailable(companyId: string, feature: keyof SubscriptionPlan['limits']): Promise<boolean> {
    const subscription = await this.getSubscription(companyId);
    const plan = this.getPlan(subscription?.plan || 'free');

    if (!plan) return false;

    const value = plan.limits[feature];
    return typeof value === 'boolean' ? value : value !== 0;
  },

  /**
   * Calculate prorated amount for plan change
   */
  calculateProratedAmount(
    currentPlan: PlanType,
    newPlan: PlanType,
    billingCycle: BillingCycle,
    daysRemaining: number,
    totalDays: number
  ): number {
    const current = this.getPlan(currentPlan);
    const next = this.getPlan(newPlan);

    if (!current || !next) return 0;

    const currentPrice = billingCycle === 'monthly' ? current.priceMonthly : current.priceYearly;
    const nextPrice = billingCycle === 'monthly' ? next.priceMonthly : next.priceYearly;

    const currentDailyRate = currentPrice / totalDays;
    const nextDailyRate = nextPrice / totalDays;

    // Credit for unused days on current plan
    const credit = currentDailyRate * daysRemaining;
    // Cost for remaining days on new plan
    const charge = nextDailyRate * daysRemaining;

    return Math.max(0, Math.round(charge - credit));
  },
};
