import { getSupabaseClient } from '../client';
import type { Tables, InsertTables } from '../types/database';

export type PointTransaction = Tables<'point_transactions'>;
export type PointTransactionInsert = InsertTables<'point_transactions'>;

export interface PointSettings {
  pointRate: number; // points per yen (e.g., 0.01 = 1 point per 100 yen)
  expiryMonths: number; // months until expiry (0 = never expire)
  minRedeemPoints: number; // minimum points to redeem
  pointValue: number; // yen value per point (e.g., 1 = 1 point = 1 yen)
}

const DEFAULT_POINT_SETTINGS: PointSettings = {
  pointRate: 0.01, // 1%
  expiryMonths: 12, // 12 months
  minRedeemPoints: 100,
  pointValue: 1,
};

export const pointService = {
  // Get company point settings
  async getSettings(companyId: string): Promise<PointSettings> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    if (error) throw error;

    const companyData = data as { settings?: Record<string, unknown> } | null;
    const settings = companyData?.settings || {};
    return {
      pointRate: (settings.point_rate as number) ?? DEFAULT_POINT_SETTINGS.pointRate,
      expiryMonths: (settings.point_expiry_months as number) ?? DEFAULT_POINT_SETTINGS.expiryMonths,
      minRedeemPoints: (settings.min_redeem_points as number) ?? DEFAULT_POINT_SETTINGS.minRedeemPoints,
      pointValue: (settings.point_value as number) ?? DEFAULT_POINT_SETTINGS.pointValue,
    };
  },

  // Update company point settings
  async updateSettings(companyId: string, settings: Partial<PointSettings>): Promise<void> {
    const supabase = getSupabaseClient();

    // Get current settings
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    if (fetchError) throw fetchError;

    const companyData = company as { settings?: Record<string, unknown> } | null;
    const currentSettings = companyData?.settings || {};
    const updatedSettings = {
      ...currentSettings,
      point_rate: settings.pointRate ?? currentSettings.point_rate,
      point_expiry_months: settings.expiryMonths ?? currentSettings.point_expiry_months,
      min_redeem_points: settings.minRedeemPoints ?? currentSettings.min_redeem_points,
      point_value: settings.pointValue ?? currentSettings.point_value,
    };

    const { error } = await (supabase
      .from('companies') as ReturnType<typeof supabase.from>)
      .update({ settings: updatedSettings } as Record<string, unknown>)
      .eq('id', companyId);

    if (error) throw error;
  },

  // Calculate points for a sale amount
  async calculatePoints(companyId: string, amount: number): Promise<number> {
    const settings = await this.getSettings(companyId);
    return Math.floor(amount * settings.pointRate);
  },

  // Calculate expiry date based on company settings
  async calculateExpiryDate(companyId: string): Promise<string | null> {
    const settings = await this.getSettings(companyId);
    if (settings.expiryMonths === 0) return null; // Never expire

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + settings.expiryMonths);
    return expiryDate.toISOString();
  },

  // Get point transactions for a customer
  async getByCustomer(customerId: string, limit = 50): Promise<PointTransaction[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  // Get point balance for a customer
  async getBalance(customerId: string): Promise<number> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('customers')
      .select('points_balance')
      .eq('id', customerId)
      .single();

    if (error) throw error;
    const customerData = data as { points_balance?: number } | null;
    return customerData?.points_balance || 0;
  },

  // Add points (earn) - auto-calculates expiry if not provided
  async earnPoints(
    companyId: string,
    customerId: string,
    points: number,
    saleId?: string,
    description?: string,
    expiresAt?: string
  ): Promise<PointTransaction> {
    const supabase = getSupabaseClient();

    // Get current balance
    const currentBalance = await this.getBalance(customerId);
    const newBalance = currentBalance + points;

    // Calculate expiry date if not provided
    let finalExpiresAt = expiresAt;
    if (!finalExpiresAt) {
      finalExpiresAt = await this.calculateExpiryDate(companyId) || undefined;
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await (supabase
      .from('point_transactions') as ReturnType<typeof supabase.from>)
      .insert({
        company_id: companyId,
        customer_id: customerId,
        sale_id: saleId || null,
        transaction_type: 'earn',
        points: points,
        balance_after: newBalance,
        description: description || 'ポイント付与',
        expires_at: finalExpiresAt || null,
      } as Record<string, unknown>)
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Update customer balance
    const { error: updateError } = await (supabase
      .from('customers') as ReturnType<typeof supabase.from>)
      .update({ points_balance: newBalance } as Record<string, unknown>)
      .eq('id', customerId);

    if (updateError) throw updateError;

    return transaction as PointTransaction;
  },

  // Use points (redeem)
  async usePoints(
    companyId: string,
    customerId: string,
    points: number,
    saleId?: string,
    description?: string
  ): Promise<PointTransaction> {
    const supabase = getSupabaseClient();

    // Get current balance
    const currentBalance = await this.getBalance(customerId);

    if (currentBalance < points) {
      throw new Error('Insufficient points balance');
    }

    const newBalance = currentBalance - points;

    // Create transaction record
    const { data: transaction, error: transactionError } = await (supabase
      .from('point_transactions') as ReturnType<typeof supabase.from>)
      .insert({
        company_id: companyId,
        customer_id: customerId,
        sale_id: saleId || null,
        transaction_type: 'use',
        points: -points,
        balance_after: newBalance,
        description: description || 'ポイント利用',
      } as Record<string, unknown>)
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Update customer balance
    const { error: updateError } = await (supabase
      .from('customers') as ReturnType<typeof supabase.from>)
      .update({ points_balance: newBalance } as Record<string, unknown>)
      .eq('id', customerId);

    if (updateError) throw updateError;

    return transaction as PointTransaction;
  },

  // Adjust points (manual adjustment)
  async adjustPoints(
    companyId: string,
    customerId: string,
    points: number,
    description: string
  ): Promise<PointTransaction> {
    const supabase = getSupabaseClient();

    // Get current balance
    const currentBalance = await this.getBalance(customerId);
    const newBalance = currentBalance + points;

    // Create transaction record
    const { data: transaction, error: transactionError } = await (supabase
      .from('point_transactions') as ReturnType<typeof supabase.from>)
      .insert({
        company_id: companyId,
        customer_id: customerId,
        transaction_type: 'adjustment',
        points: points,
        balance_after: newBalance,
        description: description,
      } as Record<string, unknown>)
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Update customer balance
    const { error: updateError } = await (supabase
      .from('customers') as ReturnType<typeof supabase.from>)
      .update({ points_balance: newBalance } as Record<string, unknown>)
      .eq('id', customerId);

    if (updateError) throw updateError;

    return transaction as PointTransaction;
  },

  // Expire points (for batch processing)
  async expirePoints(
    companyId: string,
    customerId: string,
    points: number
  ): Promise<PointTransaction> {
    const supabase = getSupabaseClient();

    // Get current balance
    const currentBalance = await this.getBalance(customerId);
    const newBalance = Math.max(0, currentBalance - points);

    // Create transaction record
    const { data: transaction, error: transactionError } = await (supabase
      .from('point_transactions') as ReturnType<typeof supabase.from>)
      .insert({
        company_id: companyId,
        customer_id: customerId,
        transaction_type: 'expire',
        points: -points,
        balance_after: newBalance,
        description: 'ポイント有効期限切れ',
      } as Record<string, unknown>)
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Update customer balance
    const { error: updateError } = await (supabase
      .from('customers') as ReturnType<typeof supabase.from>)
      .update({ points_balance: newBalance } as Record<string, unknown>)
      .eq('id', customerId);

    if (updateError) throw updateError;

    return transaction as PointTransaction;
  },

  // Get expiring points
  async getExpiringPoints(companyId: string, daysUntilExpiry = 30): Promise<{
    customerId: string;
    points: number;
    expiresAt: string;
  }[]> {
    const supabase = getSupabaseClient();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

    const { data, error } = await supabase
      .from('point_transactions')
      .select('customer_id, points, expires_at')
      .eq('company_id', companyId)
      .eq('transaction_type', 'earn')
      .gt('points', 0)
      .lte('expires_at', expiryDate.toISOString())
      .gt('expires_at', new Date().toISOString());

    if (error) throw error;

    // Aggregate by customer
    const customerPoints: Record<string, { points: number; expiresAt: string }> = {};

    interface PointTx { customer_id: string; points: number; expires_at: string | null; }
    const typedData = (data || []) as PointTx[];

    for (const tx of typedData) {
      if (!customerPoints[tx.customer_id]) {
        customerPoints[tx.customer_id] = { points: 0, expiresAt: tx.expires_at! };
      }
      customerPoints[tx.customer_id].points += tx.points;
      if (tx.expires_at! < customerPoints[tx.customer_id].expiresAt) {
        customerPoints[tx.customer_id].expiresAt = tx.expires_at!;
      }
    }

    return Object.entries(customerPoints).map(([customerId, { points, expiresAt }]) => ({
      customerId,
      points,
      expiresAt,
    }));
  },
};
