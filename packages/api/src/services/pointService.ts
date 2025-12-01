import { getSupabaseClient } from '../client';
import type { Tables, InsertTables } from '../types/database';

export type PointTransaction = Tables<'point_transactions'>;
export type PointTransactionInsert = InsertTables<'point_transactions'>;

export const pointService = {
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
    return data?.points_balance || 0;
  },

  // Add points (earn)
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

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('point_transactions')
      .insert({
        company_id: companyId,
        customer_id: customerId,
        sale_id: saleId || null,
        transaction_type: 'earn',
        points: points,
        balance_after: newBalance,
        description: description || 'ポイント付与',
        expires_at: expiresAt || null,
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Update customer balance
    const { error: updateError } = await supabase
      .from('customers')
      .update({ points_balance: newBalance })
      .eq('id', customerId);

    if (updateError) throw updateError;

    return transaction;
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
    const { data: transaction, error: transactionError } = await supabase
      .from('point_transactions')
      .insert({
        company_id: companyId,
        customer_id: customerId,
        sale_id: saleId || null,
        transaction_type: 'use',
        points: -points,
        balance_after: newBalance,
        description: description || 'ポイント利用',
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Update customer balance
    const { error: updateError } = await supabase
      .from('customers')
      .update({ points_balance: newBalance })
      .eq('id', customerId);

    if (updateError) throw updateError;

    return transaction;
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
    const { data: transaction, error: transactionError } = await supabase
      .from('point_transactions')
      .insert({
        company_id: companyId,
        customer_id: customerId,
        transaction_type: 'adjustment',
        points: points,
        balance_after: newBalance,
        description: description,
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Update customer balance
    const { error: updateError } = await supabase
      .from('customers')
      .update({ points_balance: newBalance })
      .eq('id', customerId);

    if (updateError) throw updateError;

    return transaction;
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
    const { data: transaction, error: transactionError } = await supabase
      .from('point_transactions')
      .insert({
        company_id: companyId,
        customer_id: customerId,
        transaction_type: 'expire',
        points: -points,
        balance_after: newBalance,
        description: 'ポイント有効期限切れ',
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Update customer balance
    const { error: updateError } = await supabase
      .from('customers')
      .update({ points_balance: newBalance })
      .eq('id', customerId);

    if (updateError) throw updateError;

    return transaction;
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

    for (const tx of data || []) {
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
