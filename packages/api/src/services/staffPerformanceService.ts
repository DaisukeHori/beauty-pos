import { getSupabaseClient } from '../client';

export interface StaffPerformance {
  staffId: string;
  staffName: string;
  avatarUrl?: string;
  totalSales: number;
  saleCount: number;
  nominationCount: number;
  nominationRevenue: number;
  customerCount: number;
  averageSale: number;
  productSales: number;
  menuSales: number;
}

export interface StaffRanking {
  rank: number;
  staffId: string;
  staffName: string;
  avatarUrl?: string;
  value: number;
  change?: number; // Change from previous period
}

export interface PerformancePeriod {
  startDate: string;
  endDate: string;
}

export const staffPerformanceService = {
  // Get staff performance for a period
  async getPerformance(
    storeId: string,
    startDate: string,
    endDate: string
  ): Promise<StaffPerformance[]> {
    const supabase = getSupabaseClient();

    // Get all staff in the store
    const { data: staffList, error: staffError } = await supabase
      .from('staff_stores')
      .select(`
        staff:staff_id (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('store_id', storeId);

    if (staffError) throw staffError;

    const performances: StaffPerformance[] = [];

    interface StaffStoreItem {
      staff?: { id: string; first_name: string; last_name: string; avatar_url?: string };
    }
    const typedStaffList = (staffList || []) as StaffStoreItem[];

    for (const item of typedStaffList) {
      const staff = item.staff;
      if (!staff) continue;

      // Get sales data for this staff
      const { data: salesData, error: salesError } = await supabase
        .from('sale_items')
        .select(`
          id,
          subtotal,
          nomination_fee,
          item_type,
          sale:sale_id (
            id,
            customer_id,
            sale_date
          )
        `)
        .eq('staff_id', staff.id)
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`);

      if (salesError) throw salesError;

      // Calculate metrics
      let totalSales = 0;
      let nominationCount = 0;
      let nominationRevenue = 0;
      let productSales = 0;
      let menuSales = 0;
      const customerIds = new Set<string>();

      interface SaleItemData {
        id: string;
        subtotal?: number;
        nomination_fee?: number;
        item_type?: string;
        sale?: { id: string; customer_id?: string; sale_date: string };
      }
      const typedSalesData = (salesData || []) as SaleItemData[];

      for (const saleItem of typedSalesData) {
        totalSales += saleItem.subtotal || 0;

        if (saleItem.nomination_fee && saleItem.nomination_fee > 0) {
          nominationCount++;
          nominationRevenue += saleItem.nomination_fee;
        }

        if (saleItem.item_type === 'product') {
          productSales += saleItem.subtotal || 0;
        } else if (saleItem.item_type === 'menu') {
          menuSales += saleItem.subtotal || 0;
        }

        const sale = saleItem.sale;
        if (sale?.customer_id) {
          customerIds.add(sale.customer_id);
        }
      }

      const saleCount = salesData?.length || 0;

      performances.push({
        staffId: staff.id,
        staffName: `${staff.last_name} ${staff.first_name}`,
        avatarUrl: staff.avatar_url,
        totalSales,
        saleCount,
        nominationCount,
        nominationRevenue,
        customerCount: customerIds.size,
        averageSale: saleCount > 0 ? Math.round(totalSales / saleCount) : 0,
        productSales,
        menuSales,
      });
    }

    return performances;
  },

  // Get sales ranking
  async getSalesRanking(
    storeId: string,
    startDate: string,
    endDate: string,
    limit = 10
  ): Promise<StaffRanking[]> {
    const performances = await this.getPerformance(storeId, startDate, endDate);

    return performances
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, limit)
      .map((p, index) => ({
        rank: index + 1,
        staffId: p.staffId,
        staffName: p.staffName,
        avatarUrl: p.avatarUrl,
        value: p.totalSales,
      }));
  },

  // Get nomination ranking
  async getNominationRanking(
    storeId: string,
    startDate: string,
    endDate: string,
    limit = 10
  ): Promise<StaffRanking[]> {
    const performances = await this.getPerformance(storeId, startDate, endDate);

    return performances
      .sort((a, b) => b.nominationCount - a.nominationCount)
      .slice(0, limit)
      .map((p, index) => ({
        rank: index + 1,
        staffId: p.staffId,
        staffName: p.staffName,
        avatarUrl: p.avatarUrl,
        value: p.nominationCount,
      }));
  },

  // Get customer count ranking
  async getCustomerRanking(
    storeId: string,
    startDate: string,
    endDate: string,
    limit = 10
  ): Promise<StaffRanking[]> {
    const performances = await this.getPerformance(storeId, startDate, endDate);

    return performances
      .sort((a, b) => b.customerCount - a.customerCount)
      .slice(0, limit)
      .map((p, index) => ({
        rank: index + 1,
        staffId: p.staffId,
        staffName: p.staffName,
        avatarUrl: p.avatarUrl,
        value: p.customerCount,
      }));
  },

  // Get monthly summary for a staff member
  async getMonthlySummary(
    staffId: string,
    year: number,
    month: number
  ): Promise<{
    totalSales: number;
    saleCount: number;
    nominationCount: number;
    averageSale: number;
    dailySales: { date: string; sales: number }[];
  }> {
    const supabase = getSupabaseClient();

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const { data: salesData, error } = await supabase
      .from('sale_items')
      .select(`
        subtotal,
        nomination_fee,
        created_at
      `)
      .eq('staff_id', staffId)
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`);

    if (error) throw error;

    // Calculate totals
    let totalSales = 0;
    let nominationCount = 0;
    const dailySalesMap: Record<string, number> = {};

    interface SaleItemData {
      subtotal?: number;
      nomination_fee?: number;
      created_at: string;
    }
    const typedSalesData = (salesData || []) as SaleItemData[];

    for (const item of typedSalesData) {
      totalSales += item.subtotal || 0;

      if (item.nomination_fee && item.nomination_fee > 0) {
        nominationCount++;
      }

      const date = item.created_at.split('T')[0];
      dailySalesMap[date] = (dailySalesMap[date] || 0) + (item.subtotal || 0);
    }

    const saleCount = salesData?.length || 0;

    // Build daily sales array
    const dailySales: { date: string; sales: number }[] = [];
    for (let day = 1; day <= lastDay; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dailySales.push({
        date,
        sales: dailySalesMap[date] || 0,
      });
    }

    return {
      totalSales,
      saleCount,
      nominationCount,
      averageSale: saleCount > 0 ? Math.round(totalSales / saleCount) : 0,
      dailySales,
    };
  },

  // Calculate incentive/commission
  async calculateIncentive(
    staffId: string,
    startDate: string,
    endDate: string,
    rates: {
      salesRate?: number; // Percentage of sales
      nominationRate?: number; // Percentage of nomination fees
      productRate?: number; // Percentage of product sales
    } = {}
  ): Promise<{
    salesIncentive: number;
    nominationIncentive: number;
    productIncentive: number;
    totalIncentive: number;
    breakdown: {
      totalSales: number;
      nominationRevenue: number;
      productSales: number;
    };
  }> {
    const supabase = getSupabaseClient();

    const defaultRates = {
      salesRate: 0.05, // 5% of menu sales
      nominationRate: 0.50, // 50% of nomination fees
      productRate: 0.10, // 10% of product sales
    };

    const finalRates = { ...defaultRates, ...rates };

    const { data: salesData, error } = await supabase
      .from('sale_items')
      .select('subtotal, nomination_fee, item_type')
      .eq('staff_id', staffId)
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`);

    if (error) throw error;

    let totalSales = 0;
    let nominationRevenue = 0;
    let productSales = 0;

    interface IncentiveSaleItem {
      subtotal?: number;
      nomination_fee?: number;
      item_type?: string;
    }
    const typedSalesData = (salesData || []) as IncentiveSaleItem[];

    for (const item of typedSalesData) {
      if (item.item_type === 'product') {
        productSales += item.subtotal || 0;
      } else {
        totalSales += item.subtotal || 0;
      }
      nominationRevenue += item.nomination_fee || 0;
    }

    const salesIncentive = Math.floor(totalSales * finalRates.salesRate);
    const nominationIncentive = Math.floor(nominationRevenue * finalRates.nominationRate);
    const productIncentive = Math.floor(productSales * finalRates.productRate);

    return {
      salesIncentive,
      nominationIncentive,
      productIncentive,
      totalIncentive: salesIncentive + nominationIncentive + productIncentive,
      breakdown: {
        totalSales,
        nominationRevenue,
        productSales,
      },
    };
  },

  // Get store-wide daily performance
  async getDailyPerformance(
    storeId: string,
    date: string
  ): Promise<{
    totalSales: number;
    customerCount: number;
    averageSale: number;
    topStaff: { staffId: string; staffName: string; sales: number } | null;
    hourlyBreakdown: { hour: number; sales: number; count: number }[];
  }> {
    const supabase = getSupabaseClient();

    // Get all sales for the day
    const { data: sales, error } = await supabase
      .from('sales')
      .select(`
        id,
        total,
        customer_id,
        sale_date,
        items:sale_items (
          subtotal,
          staff_id,
          staff:staff_id (
            first_name,
            last_name
          )
        )
      `)
      .eq('store_id', storeId)
      .gte('sale_date', `${date}T00:00:00`)
      .lte('sale_date', `${date}T23:59:59`)
      .eq('status', 'completed');

    if (error) throw error;

    let totalSales = 0;
    const customerIds = new Set<string>();
    const staffSales: Record<string, { name: string; sales: number }> = {};
    const hourlyBreakdown: { hour: number; sales: number; count: number }[] =
      Array.from({ length: 24 }, (_, i) => ({ hour: i, sales: 0, count: 0 }));

    interface SaleData {
      total?: number;
      customer_id?: string;
      sale_date: string;
      items?: Array<{ subtotal: number; staff_id: string; staff?: { first_name: string; last_name: string } }>;
    }
    const typedSales = (sales || []) as SaleData[];

    for (const sale of typedSales) {
      totalSales += sale.total || 0;

      if (sale.customer_id) {
        customerIds.add(sale.customer_id);
      }

      const hour = new Date(sale.sale_date).getHours();
      hourlyBreakdown[hour].sales += sale.total || 0;
      hourlyBreakdown[hour].count += 1;

      // Aggregate by staff
      for (const item of sale.items || []) {
        const staffItem = item as { subtotal: number; staff_id: string; staff?: { first_name: string; last_name: string } };
        if (staffItem.staff_id && staffItem.staff) {
          if (!staffSales[staffItem.staff_id]) {
            staffSales[staffItem.staff_id] = {
              name: `${staffItem.staff.last_name} ${staffItem.staff.first_name}`,
              sales: 0,
            };
          }
          staffSales[staffItem.staff_id].sales += staffItem.subtotal || 0;
        }
      }
    }

    // Find top staff
    let topStaff: { staffId: string; staffName: string; sales: number } | null = null;
    for (const [staffId, data] of Object.entries(staffSales)) {
      if (!topStaff || data.sales > topStaff.sales) {
        topStaff = {
          staffId,
          staffName: data.name,
          sales: data.sales,
        };
      }
    }

    const saleCount = sales?.length || 0;

    return {
      totalSales,
      customerCount: customerIds.size,
      averageSale: saleCount > 0 ? Math.round(totalSales / saleCount) : 0,
      topStaff,
      hourlyBreakdown: hourlyBreakdown.filter(h => h.sales > 0 || h.count > 0),
    };
  },
};
