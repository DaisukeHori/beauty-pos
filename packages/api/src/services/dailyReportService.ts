import { getSupabaseClient } from '../client';

// Manual type definition since 'daily_reports' may not exist in generated types
export interface DailyReport {
  id: string;
  company_id: string;
  store_id: string;
  report_date: string;
  gross_sales: number | null;
  net_sales: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  transaction_count: number | null;
  customer_count: number | null;
  cash_sales: number | null;
  card_sales: number | null;
  electronic_money_sales: number | null;
  qr_sales: number | null;
  credit_sales: number | null;
  is_closed: boolean;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyReportInsert {
  company_id: string;
  store_id: string;
  report_date: string;
  gross_sales?: number | null;
  net_sales?: number | null;
  tax_amount?: number | null;
  discount_amount?: number | null;
  transaction_count?: number | null;
  customer_count?: number | null;
  cash_sales?: number | null;
  card_sales?: number | null;
  electronic_money_sales?: number | null;
  qr_sales?: number | null;
  credit_sales?: number | null;
}

export interface DailyReportUpdate {
  gross_sales?: number | null;
  net_sales?: number | null;
  tax_amount?: number | null;
  discount_amount?: number | null;
  transaction_count?: number | null;
  customer_count?: number | null;
  cash_sales?: number | null;
  card_sales?: number | null;
  electronic_money_sales?: number | null;
  qr_sales?: number | null;
  credit_sales?: number | null;
  is_closed?: boolean;
  closed_by?: string | null;
  closed_at?: string | null;
}

export const dailyReportService = {
  async getByDate(companyId: string, storeId: string, date: string): Promise<DailyReport | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .eq('report_date', date)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getRange(
    companyId: string,
    storeId: string,
    startDate: string,
    endDate: string
  ): Promise<DailyReport[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .gte('report_date', startDate)
      .lte('report_date', endDate)
      .order('report_date', { ascending: false });

    if (error) throw error;
    return (data || []) as DailyReport[];
  },

  async getMonthly(companyId: string, storeId: string, year: number, month: number): Promise<DailyReport[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    return this.getRange(companyId, storeId, startDate, endDate);
  },

  async generate(companyId: string, storeId: string, date: string): Promise<DailyReport> {
    const supabase = getSupabaseClient();

    // Call edge function to generate report
    const { data, error } = await supabase.functions.invoke('daily-report', {
      body: { companyId, storeId, date },
    });

    if (error) throw error;

    // Fetch the saved report
    const report = await this.getByDate(companyId, storeId, date);
    if (!report) throw new Error('Report generation failed');

    return report;
  },

  async close(id: string, closedBy: string): Promise<DailyReport> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('daily_reports') as ReturnType<typeof supabase.from>)
      .update({
        is_closed: true,
        closed_by: closedBy,
        closed_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as DailyReport;
  },

  async getSummary(companyId: string, storeId: string, startDate: string, endDate: string) {
    const reports = await this.getRange(companyId, storeId, startDate, endDate);

    return {
      totalSales: reports.reduce((sum, r) => sum + (r.net_sales || 0), 0),
      totalTransactions: reports.reduce((sum, r) => sum + (r.transaction_count || 0), 0),
      totalCustomers: reports.reduce((sum, r) => sum + (r.customer_count || 0), 0),
      averageDailySales: reports.length > 0
        ? Math.round(reports.reduce((sum, r) => sum + (r.net_sales || 0), 0) / reports.length)
        : 0,
      averageTicket: reports.reduce((sum, r) => sum + (r.transaction_count || 0), 0) > 0
        ? Math.round(
            reports.reduce((sum, r) => sum + (r.net_sales || 0), 0) /
            reports.reduce((sum, r) => sum + (r.transaction_count || 0), 0)
          )
        : 0,
      paymentBreakdown: {
        cash: reports.reduce((sum, r) => sum + (r.cash_sales || 0), 0),
        card: reports.reduce((sum, r) => sum + (r.card_sales || 0), 0),
        electronicMoney: reports.reduce((sum, r) => sum + (r.electronic_money_sales || 0), 0),
        qr: reports.reduce((sum, r) => sum + (r.qr_sales || 0), 0),
        credit: reports.reduce((sum, r) => sum + (r.credit_sales || 0), 0),
      },
      reports,
    };
  },
};
