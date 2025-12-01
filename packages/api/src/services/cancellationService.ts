import { getSupabaseClient } from '../client';
import type { Tables } from '../types/database';

export interface CancellationPolicy {
  id: string;
  companyId: string;
  storeId?: string;
  name: string;
  rules: CancellationRule[];
  noShowFeePercentage: number;
  maxNoShowsBeforeBlacklist: number;
  isActive: boolean;
}

export interface CancellationRule {
  hoursBeforeAppointment: number;
  feePercentage: number;
  description: string;
}

export interface CancellationFeeResult {
  feePercentage: number;
  feeAmount: number;
  ruleApplied: string;
  isNoShow: boolean;
}

export interface CustomerCancellationHistory {
  customerId: string;
  totalCancellations: number;
  noShowCount: number;
  lateCancel24hCount: number;
  lateCancel48hCount: number;
  lastCancellationAt?: string;
  isBlacklisted: boolean;
  totalPenaltyFees: number;
}

export const cancellationService = {
  /**
   * Get cancellation policy for a company/store
   */
  async getPolicy(companyId: string, storeId?: string): Promise<CancellationPolicy | null> {
    const supabase = getSupabaseClient();

    // First try to get store-specific policy
    if (storeId) {
      const { data: storePolicy } = await supabase
        .from('cancellation_policies')
        .select('*')
        .eq('company_id', companyId)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .single();

      if (storePolicy) {
        return this.mapPolicy(storePolicy);
      }
    }

    // Fall back to company-wide policy
    const { data: companyPolicy } = await supabase
      .from('cancellation_policies')
      .select('*')
      .eq('company_id', companyId)
      .is('store_id', null)
      .eq('is_active', true)
      .single();

    if (companyPolicy) {
      return this.mapPolicy(companyPolicy);
    }

    // Return default policy if none configured
    return this.getDefaultPolicy(companyId);
  },

  /**
   * Get default cancellation policy
   */
  getDefaultPolicy(companyId: string): CancellationPolicy {
    return {
      id: 'default',
      companyId,
      name: 'デフォルトポリシー',
      rules: [
        { hoursBeforeAppointment: 24, feePercentage: 50, description: '24時間以内のキャンセル' },
        { hoursBeforeAppointment: 48, feePercentage: 30, description: '48時間以内のキャンセル' },
        { hoursBeforeAppointment: 0, feePercentage: 0, description: '48時間以上前のキャンセル' },
      ],
      noShowFeePercentage: 100,
      maxNoShowsBeforeBlacklist: 3,
      isActive: true,
    };
  },

  /**
   * Map database record to CancellationPolicy
   */
  mapPolicy(record: Record<string, unknown>): CancellationPolicy {
    return {
      id: record.id as string,
      companyId: record.company_id as string,
      storeId: record.store_id as string | undefined,
      name: record.name as string,
      rules: record.rules as CancellationRule[],
      noShowFeePercentage: record.no_show_fee_percentage as number || 100,
      maxNoShowsBeforeBlacklist: record.max_no_shows_before_blacklist as number || 3,
      isActive: record.is_active as boolean,
    };
  },

  /**
   * Save cancellation policy
   */
  async savePolicy(policy: Omit<CancellationPolicy, 'id'> & { id?: string }): Promise<CancellationPolicy> {
    const supabase = getSupabaseClient();

    const record = {
      company_id: policy.companyId,
      store_id: policy.storeId || null,
      name: policy.name,
      rules: policy.rules,
      no_show_fee_percentage: policy.noShowFeePercentage,
      max_no_shows_before_blacklist: policy.maxNoShowsBeforeBlacklist,
      is_active: policy.isActive,
    };

    if (policy.id) {
      const { data, error } = await supabase
        .from('cancellation_policies')
        .update(record)
        .eq('id', policy.id)
        .select()
        .single();

      if (error) throw error;
      return this.mapPolicy(data);
    } else {
      const { data, error } = await supabase
        .from('cancellation_policies')
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      return this.mapPolicy(data);
    }
  },

  /**
   * Calculate cancellation fee for a reservation
   */
  async calculateFee(
    reservationId: string,
    isNoShow: boolean = false
  ): Promise<CancellationFeeResult> {
    const supabase = getSupabaseClient();

    // Get reservation details
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select('*, store:stores(*)')
      .eq('id', reservationId)
      .single();

    if (resError || !reservation) {
      throw new Error('Reservation not found');
    }

    // Get the policy
    const policy = await this.getPolicy(reservation.company_id, reservation.store_id);
    if (!policy) {
      return {
        feePercentage: 0,
        feeAmount: 0,
        ruleApplied: 'ポリシーなし',
        isNoShow,
      };
    }

    // Calculate estimated price from reservation (or use a default)
    const estimatedPrice = reservation.estimated_price || reservation.total_price || 0;

    // Handle no-show
    if (isNoShow) {
      return {
        feePercentage: policy.noShowFeePercentage,
        feeAmount: Math.floor(estimatedPrice * policy.noShowFeePercentage / 100),
        ruleApplied: '無断キャンセル（ノーショー）',
        isNoShow: true,
      };
    }

    // Calculate hours until appointment
    const appointmentTime = new Date(reservation.start_time).getTime();
    const now = Date.now();
    const hoursUntilAppointment = (appointmentTime - now) / (1000 * 60 * 60);

    // Find applicable rule (sorted by hours, descending)
    const sortedRules = [...policy.rules].sort((a, b) => b.hoursBeforeAppointment - a.hoursBeforeAppointment);

    for (const rule of sortedRules) {
      if (hoursUntilAppointment <= rule.hoursBeforeAppointment) {
        return {
          feePercentage: rule.feePercentage,
          feeAmount: Math.floor(estimatedPrice * rule.feePercentage / 100),
          ruleApplied: rule.description,
          isNoShow: false,
        };
      }
    }

    // No fee if beyond all rules
    return {
      feePercentage: 0,
      feeAmount: 0,
      ruleApplied: 'キャンセル料なし',
      isNoShow: false,
    };
  },

  /**
   * Process cancellation with fee
   */
  async processCancellation(
    reservationId: string,
    reason: string,
    isNoShow: boolean = false,
    waiveFee: boolean = false
  ): Promise<{
    reservation: Tables<'reservations'>;
    feeResult: CancellationFeeResult;
    penaltyApplied: boolean;
  }> {
    const supabase = getSupabaseClient();

    // Get reservation
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single();

    if (resError || !reservation) {
      throw new Error('Reservation not found');
    }

    // Calculate fee
    const feeResult = await this.calculateFee(reservationId, isNoShow);
    const actualFee = waiveFee ? 0 : feeResult.feeAmount;

    // Update reservation
    const { data: updatedReservation, error: updateError } = await supabase
      .from('reservations')
      .update({
        status: isNoShow ? 'no_show' : 'cancelled',
        cancellation_reason: reason,
        cancellation_fee: actualFee,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', reservationId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Record cancellation history
    if (reservation.customer_id) {
      await this.recordCancellation(
        reservation.company_id,
        reservation.customer_id,
        reservationId,
        isNoShow,
        actualFee,
        feeResult.ruleApplied
      );

      // Check if customer should be blacklisted
      const history = await this.getCustomerHistory(reservation.company_id, reservation.customer_id);
      const policy = await this.getPolicy(reservation.company_id, reservation.store_id);

      if (policy && history.noShowCount >= policy.maxNoShowsBeforeBlacklist) {
        await this.blacklistCustomer(reservation.company_id, reservation.customer_id, 'no_show_limit');
      }
    }

    return {
      reservation: updatedReservation,
      feeResult: { ...feeResult, feeAmount: actualFee },
      penaltyApplied: actualFee > 0,
    };
  },

  /**
   * Record cancellation in history
   */
  async recordCancellation(
    companyId: string,
    customerId: string,
    reservationId: string,
    isNoShow: boolean,
    feeAmount: number,
    ruleApplied: string
  ): Promise<void> {
    const supabase = getSupabaseClient();

    await supabase
      .from('cancellation_records')
      .insert({
        company_id: companyId,
        customer_id: customerId,
        reservation_id: reservationId,
        cancellation_type: isNoShow ? 'no_show' : 'cancelled',
        fee_amount: feeAmount,
        rule_applied: ruleApplied,
        created_at: new Date().toISOString(),
      });
  },

  /**
   * Get customer cancellation history
   */
  async getCustomerHistory(
    companyId: string,
    customerId: string
  ): Promise<CustomerCancellationHistory> {
    const supabase = getSupabaseClient();

    // Get cancellation records
    const { data: records } = await supabase
      .from('cancellation_records')
      .select('*')
      .eq('company_id', companyId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    // Get customer blacklist status
    const { data: customer } = await supabase
      .from('customers')
      .select('is_blacklisted')
      .eq('id', customerId)
      .single();

    const cancellations = records || [];
    const noShowCount = cancellations.filter((r: Record<string, unknown>) => r.cancellation_type === 'no_show').length;
    const totalPenaltyFees = cancellations.reduce((sum: number, r: Record<string, unknown>) => sum + ((r.fee_amount as number) || 0), 0);

    // Calculate late cancellation counts (using 24h and 48h thresholds)
    const lateCancel24hCount = cancellations.filter((r: Record<string, unknown>) =>
      r.cancellation_type === 'cancelled' &&
      ((r.rule_applied as string) || '').includes('24')
    ).length;

    const lateCancel48hCount = cancellations.filter((r: Record<string, unknown>) =>
      r.cancellation_type === 'cancelled' &&
      ((r.rule_applied as string) || '').includes('48')
    ).length;

    return {
      customerId,
      totalCancellations: cancellations.length,
      noShowCount,
      lateCancel24hCount,
      lateCancel48hCount,
      lastCancellationAt: cancellations[0]?.created_at as string | undefined,
      isBlacklisted: customer?.is_blacklisted || false,
      totalPenaltyFees,
    };
  },

  /**
   * Blacklist a customer
   */
  async blacklistCustomer(
    companyId: string,
    customerId: string,
    reason: 'no_show_limit' | 'manual' | 'fraud'
  ): Promise<void> {
    const supabase = getSupabaseClient();

    await supabase
      .from('customers')
      .update({
        is_blacklisted: true,
        blacklist_reason: reason,
        blacklisted_at: new Date().toISOString(),
      })
      .eq('id', customerId)
      .eq('company_id', companyId);

    // Log the blacklist event
    await supabase
      .from('audit_logs')
      .insert({
        company_id: companyId,
        entity_type: 'customer',
        entity_id: customerId,
        action: 'blacklist',
        details: { reason },
      });
  },

  /**
   * Remove customer from blacklist
   */
  async removeFromBlacklist(companyId: string, customerId: string): Promise<void> {
    const supabase = getSupabaseClient();

    await supabase
      .from('customers')
      .update({
        is_blacklisted: false,
        blacklist_reason: null,
        blacklisted_at: null,
      })
      .eq('id', customerId)
      .eq('company_id', companyId);
  },

  /**
   * Get customers at risk of blacklisting
   */
  async getAtRiskCustomers(companyId: string): Promise<Array<{
    customerId: string;
    customerName: string;
    noShowCount: number;
    warningThreshold: number;
  }>> {
    const supabase = getSupabaseClient();

    // Get policy
    const policy = await this.getPolicy(companyId);
    const threshold = policy?.maxNoShowsBeforeBlacklist || 3;
    const warningAt = threshold - 1;

    // Get customers with high no-show counts
    const { data: records } = await supabase
      .from('cancellation_records')
      .select('customer_id')
      .eq('company_id', companyId)
      .eq('cancellation_type', 'no_show');

    if (!records) return [];

    // Count no-shows per customer
    const noShowCounts: Record<string, number> = {};
    records.forEach((r: { customer_id: string }) => {
      noShowCounts[r.customer_id] = (noShowCounts[r.customer_id] || 0) + 1;
    });

    // Filter to at-risk customers (at warning threshold)
    const atRiskCustomerIds = Object.entries(noShowCounts)
      .filter(([, count]) => count >= warningAt && count < threshold)
      .map(([id]) => id);

    if (atRiskCustomerIds.length === 0) return [];

    // Get customer names
    const { data: customers } = await supabase
      .from('customers')
      .select('id, first_name, last_name')
      .in('id', atRiskCustomerIds)
      .eq('is_blacklisted', false);

    return (customers || []).map((c: { id: string; first_name: string; last_name: string }) => ({
      customerId: c.id,
      customerName: `${c.last_name} ${c.first_name}`,
      noShowCount: noShowCounts[c.id],
      warningThreshold: threshold,
    }));
  },

  /**
   * Get byDateRange for a specific reservation
   */
  async getByDateRange(storeId: string, startDate: string, endDate: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        customer:customers(*),
        staff:staff(*)
      `)
      .eq('store_id', storeId)
      .gte('start_time', `${startDate}T00:00:00`)
      .lte('start_time', `${endDate}T23:59:59`)
      .order('start_time');

    if (error) throw error;
    return data || [];
  },
};
