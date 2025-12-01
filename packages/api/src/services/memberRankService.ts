import { getSupabaseClient } from '../client';

export interface MemberRank {
  id: string;
  companyId: string;
  name: string;
  level: number;
  color: string;
  minSpend?: number;
  minVisits?: number;
  minPoints?: number;
  pointMultiplier: number;
  discountPercentage: number;
  benefits: string[];
  isDefault: boolean;
}

export interface MemberRankConfig {
  companyId: string;
  calculationBasis: 'spend' | 'visits' | 'points' | 'combined';
  calculationPeriodMonths: number; // 0 = lifetime
  autoDowngrade: boolean;
  downgradeGracePeriodDays: number;
}

export interface CustomerRankInfo {
  customerId: string;
  currentRank: MemberRank;
  nextRank?: MemberRank;
  totalSpend: number;
  totalVisits: number;
  totalPoints: number;
  spendToNextRank?: number;
  visitsToNextRank?: number;
  pointsToNextRank?: number;
  rankHistory: RankChangeRecord[];
}

export interface RankChangeRecord {
  previousRank: string;
  newRank: string;
  changeType: 'promotion' | 'demotion' | 'initial';
  changedAt: string;
  reason: string;
}

export const memberRankService = {
  /**
   * Get all ranks for a company
   */
  async getRanks(companyId: string): Promise<MemberRank[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('member_ranks')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('level', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return this.getDefaultRanks(companyId);
    }

    return data.map(this.mapRank);
  },

  /**
   * Get default ranks
   */
  getDefaultRanks(companyId: string): MemberRank[] {
    return [
      {
        id: 'default-regular',
        companyId,
        name: 'レギュラー',
        level: 1,
        color: '#9E9E9E',
        minSpend: 0,
        minVisits: 0,
        pointMultiplier: 1.0,
        discountPercentage: 0,
        benefits: ['基本ポイント付与'],
        isDefault: true,
      },
      {
        id: 'default-silver',
        companyId,
        name: 'シルバー',
        level: 2,
        color: '#C0C0C0',
        minSpend: 50000,
        minVisits: 5,
        pointMultiplier: 1.5,
        discountPercentage: 3,
        benefits: ['ポイント1.5倍', '3%割引'],
        isDefault: false,
      },
      {
        id: 'default-gold',
        companyId,
        name: 'ゴールド',
        level: 3,
        color: '#FFD700',
        minSpend: 150000,
        minVisits: 15,
        pointMultiplier: 2.0,
        discountPercentage: 5,
        benefits: ['ポイント2倍', '5%割引', '優先予約'],
        isDefault: false,
      },
      {
        id: 'default-platinum',
        companyId,
        name: 'プラチナ',
        level: 4,
        color: '#E5E4E2',
        minSpend: 300000,
        minVisits: 30,
        pointMultiplier: 3.0,
        discountPercentage: 10,
        benefits: ['ポイント3倍', '10%割引', '優先予約', '誕生日特典'],
        isDefault: false,
      },
    ];
  },

  /**
   * Map database record to MemberRank
   */
  mapRank(record: Record<string, unknown>): MemberRank {
    return {
      id: record.id as string,
      companyId: record.company_id as string,
      name: record.name as string,
      level: record.level as number,
      color: record.color as string,
      minSpend: record.min_spend as number | undefined,
      minVisits: record.min_visits as number | undefined,
      minPoints: record.min_points as number | undefined,
      pointMultiplier: (record.point_multiplier as number) || 1.0,
      discountPercentage: (record.discount_percentage as number) || 0,
      benefits: (record.benefits as string[]) || [],
      isDefault: (record.is_default as boolean) || false,
    };
  },

  /**
   * Get rank configuration
   */
  async getConfig(companyId: string): Promise<MemberRankConfig> {
    const supabase = getSupabaseClient();

    const { data } = await supabase
      .from('member_rank_config')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (data) {
      return {
        companyId,
        calculationBasis: data.calculation_basis || 'spend',
        calculationPeriodMonths: data.calculation_period_months || 12,
        autoDowngrade: data.auto_downgrade || false,
        downgradeGracePeriodDays: data.downgrade_grace_period_days || 30,
      };
    }

    return {
      companyId,
      calculationBasis: 'spend',
      calculationPeriodMonths: 12,
      autoDowngrade: false,
      downgradeGracePeriodDays: 30,
    };
  },

  /**
   * Save rank configuration
   */
  async saveConfig(config: MemberRankConfig): Promise<void> {
    const supabase = getSupabaseClient();

    await supabase
      .from('member_rank_config')
      .upsert({
        company_id: config.companyId,
        calculation_basis: config.calculationBasis,
        calculation_period_months: config.calculationPeriodMonths,
        auto_downgrade: config.autoDowngrade,
        downgrade_grace_period_days: config.downgradeGracePeriodDays,
      }, {
        onConflict: 'company_id',
      });
  },

  /**
   * Get customer's current rank info
   */
  async getCustomerRankInfo(companyId: string, customerId: string): Promise<CustomerRankInfo> {
    const supabase = getSupabaseClient();
    const config = await this.getConfig(companyId);
    const ranks = await this.getRanks(companyId);

    // Get customer data
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Calculate stats based on period
    const stats = await this.calculateCustomerStats(companyId, customerId, config.calculationPeriodMonths);

    // Determine current rank
    const currentRank = this.determineRank(ranks, stats, config.calculationBasis);

    // Find next rank
    const nextRank = ranks.find(r => r.level === currentRank.level + 1);

    // Calculate progress to next rank
    let spendToNextRank: number | undefined;
    let visitsToNextRank: number | undefined;
    let pointsToNextRank: number | undefined;

    if (nextRank) {
      if (nextRank.minSpend) {
        spendToNextRank = Math.max(0, nextRank.minSpend - stats.totalSpend);
      }
      if (nextRank.minVisits) {
        visitsToNextRank = Math.max(0, nextRank.minVisits - stats.totalVisits);
      }
      if (nextRank.minPoints) {
        pointsToNextRank = Math.max(0, nextRank.minPoints - stats.totalPoints);
      }
    }

    // Get rank history
    const { data: history } = await supabase
      .from('customer_rank_history')
      .select('*')
      .eq('customer_id', customerId)
      .order('changed_at', { ascending: false })
      .limit(10);

    const rankHistory: RankChangeRecord[] = (history || []).map((h: Record<string, unknown>) => ({
      previousRank: h.previous_rank as string,
      newRank: h.new_rank as string,
      changeType: h.change_type as 'promotion' | 'demotion' | 'initial',
      changedAt: h.changed_at as string,
      reason: h.reason as string,
    }));

    return {
      customerId,
      currentRank,
      nextRank,
      totalSpend: stats.totalSpend,
      totalVisits: stats.totalVisits,
      totalPoints: stats.totalPoints,
      spendToNextRank,
      visitsToNextRank,
      pointsToNextRank,
      rankHistory,
    };
  },

  /**
   * Calculate customer stats for rank determination
   */
  async calculateCustomerStats(
    companyId: string,
    customerId: string,
    periodMonths: number
  ): Promise<{ totalSpend: number; totalVisits: number; totalPoints: number }> {
    const supabase = getSupabaseClient();

    let startDate: string | null = null;
    if (periodMonths > 0) {
      const date = new Date();
      date.setMonth(date.getMonth() - periodMonths);
      startDate = date.toISOString();
    }

    // Get sales total
    let salesQuery = supabase
      .from('sales')
      .select('total')
      .eq('customer_id', customerId)
      .eq('status', 'completed');

    if (startDate) {
      salesQuery = salesQuery.gte('sale_date', startDate);
    }

    const { data: sales } = await salesQuery;
    const totalSpend = (sales || []).reduce((sum: number, s: { total: number }) => sum + s.total, 0);

    // Get visit count
    let visitsQuery = supabase
      .from('visits')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .eq('status', 'checked_out');

    if (startDate) {
      visitsQuery = visitsQuery.gte('check_in_at', startDate);
    }

    const { count: totalVisits } = await visitsQuery;

    // Get current points balance (not period-based)
    const { data: customer } = await supabase
      .from('customers')
      .select('points_balance')
      .eq('id', customerId)
      .single();

    const totalPoints = customer?.points_balance || 0;

    return {
      totalSpend,
      totalVisits: totalVisits || 0,
      totalPoints,
    };
  },

  /**
   * Determine rank based on stats
   */
  determineRank(
    ranks: MemberRank[],
    stats: { totalSpend: number; totalVisits: number; totalPoints: number },
    calculationBasis: 'spend' | 'visits' | 'points' | 'combined'
  ): MemberRank {
    // Sort ranks by level descending to find highest eligible
    const sortedRanks = [...ranks].sort((a, b) => b.level - a.level);

    for (const rank of sortedRanks) {
      let eligible = true;

      switch (calculationBasis) {
        case 'spend':
          eligible = !rank.minSpend || stats.totalSpend >= rank.minSpend;
          break;
        case 'visits':
          eligible = !rank.minVisits || stats.totalVisits >= rank.minVisits;
          break;
        case 'points':
          eligible = !rank.minPoints || stats.totalPoints >= rank.minPoints;
          break;
        case 'combined':
          // All criteria must be met (if defined)
          eligible =
            (!rank.minSpend || stats.totalSpend >= rank.minSpend) &&
            (!rank.minVisits || stats.totalVisits >= rank.minVisits);
          break;
      }

      if (eligible) {
        return rank;
      }
    }

    // Return default/lowest rank
    return ranks.find(r => r.isDefault) || ranks[0];
  },

  /**
   * Check and update customer rank
   */
  async checkAndUpdateRank(companyId: string, customerId: string): Promise<{
    changed: boolean;
    previousRank?: MemberRank;
    newRank: MemberRank;
    changeType?: 'promotion' | 'demotion';
  }> {
    const supabase = getSupabaseClient();
    const config = await this.getConfig(companyId);
    const ranks = await this.getRanks(companyId);

    // Get current customer rank
    const { data: customer } = await supabase
      .from('customers')
      .select('member_rank_id')
      .eq('id', customerId)
      .single();

    const previousRankId = customer?.member_rank_id;
    const previousRank = previousRankId
      ? ranks.find(r => r.id === previousRankId)
      : ranks.find(r => r.isDefault);

    // Calculate new rank
    const stats = await this.calculateCustomerStats(companyId, customerId, config.calculationPeriodMonths);
    const newRank = this.determineRank(ranks, stats, config.calculationBasis);

    // Check if rank changed
    if (previousRank?.id === newRank.id) {
      return { changed: false, newRank };
    }

    // Determine change type
    const changeType = newRank.level > (previousRank?.level || 0) ? 'promotion' : 'demotion';

    // Check downgrade grace period if demoting
    if (changeType === 'demotion' && !config.autoDowngrade) {
      return { changed: false, newRank: previousRank || newRank };
    }

    // Update customer rank
    await supabase
      .from('customers')
      .update({
        member_rank_id: newRank.id,
        rank_updated_at: new Date().toISOString(),
      })
      .eq('id', customerId);

    // Record rank change
    await supabase
      .from('customer_rank_history')
      .insert({
        company_id: companyId,
        customer_id: customerId,
        previous_rank: previousRank?.name || 'なし',
        new_rank: newRank.name,
        change_type: changeType,
        reason: changeType === 'promotion'
          ? `${stats.totalSpend.toLocaleString()}円の利用達成`
          : '利用実績の減少',
        changed_at: new Date().toISOString(),
      });

    return {
      changed: true,
      previousRank,
      newRank,
      changeType,
    };
  },

  /**
   * Get rank-specific discount for a customer
   */
  async getCustomerDiscount(companyId: string, customerId: string): Promise<number> {
    const info = await this.getCustomerRankInfo(companyId, customerId);
    return info.currentRank.discountPercentage;
  },

  /**
   * Get point multiplier for a customer
   */
  async getPointMultiplier(companyId: string, customerId: string): Promise<number> {
    const info = await this.getCustomerRankInfo(companyId, customerId);
    return info.currentRank.pointMultiplier;
  },

  /**
   * Process batch rank updates for all customers
   */
  async processAllCustomerRanks(companyId: string): Promise<{
    processed: number;
    promotions: number;
    demotions: number;
  }> {
    const supabase = getSupabaseClient();

    // Get all active customers
    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (!customers) return { processed: 0, promotions: 0, demotions: 0 };

    let promotions = 0;
    let demotions = 0;

    for (const customer of customers) {
      const result = await this.checkAndUpdateRank(companyId, customer.id);
      if (result.changed) {
        if (result.changeType === 'promotion') promotions++;
        if (result.changeType === 'demotion') demotions++;
      }
    }

    return {
      processed: customers.length,
      promotions,
      demotions,
    };
  },

  /**
   * Create or update a member rank
   */
  async saveRank(rank: Omit<MemberRank, 'id'> & { id?: string }): Promise<MemberRank> {
    const supabase = getSupabaseClient();

    const record = {
      company_id: rank.companyId,
      name: rank.name,
      level: rank.level,
      color: rank.color,
      min_spend: rank.minSpend,
      min_visits: rank.minVisits,
      min_points: rank.minPoints,
      point_multiplier: rank.pointMultiplier,
      discount_percentage: rank.discountPercentage,
      benefits: rank.benefits,
      is_default: rank.isDefault,
      is_active: true,
    };

    if (rank.id && !rank.id.startsWith('default-')) {
      const { data, error } = await supabase
        .from('member_ranks')
        .update(record)
        .eq('id', rank.id)
        .select()
        .single();

      if (error) throw error;
      return this.mapRank(data);
    } else {
      const { data, error } = await supabase
        .from('member_ranks')
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      return this.mapRank(data);
    }
  },

  /**
   * Delete a member rank
   */
  async deleteRank(rankId: string): Promise<void> {
    const supabase = getSupabaseClient();

    await supabase
      .from('member_ranks')
      .update({ is_active: false })
      .eq('id', rankId);
  },
};
