import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables } from '../types/database';

export type Sale = Tables<'sales'>;
export type SaleItem = Tables<'sale_items'>;
export type SalePayment = Tables<'sale_payments'>;
export type SaleDiscount = Tables<'sale_discounts'>;
export type SaleItemStaffAssignment = Tables<'sale_item_staff_assignments'>;
export type SaleItemProcessAssignment = Tables<'sale_item_process_assignments'>;

export interface SaleWithDetails extends Sale {
  items: (SaleItem & {
    staff_assignments: SaleItemStaffAssignment[];
    process_assignments: SaleItemProcessAssignment[];
  })[];
  payments: SalePayment[];
  discounts: SaleDiscount[];
  customer?: Tables<'customers'> | null;
  store?: Tables<'stores'> | null;
}

export interface CreateSaleData {
  companyId: string;
  storeId: string;
  visitId?: string;
  customerId?: string;
  items: CreateSaleItemData[];
  payments: CreatePaymentData[];
  discounts?: CreateDiscountData[];
  pointsUsed?: number;
  notes?: string;
  createdBy?: string;
}

export interface CreateSaleItemData {
  itemType: 'menu' | 'product' | 'other';
  itemId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  hairLength?: string;
  hairLengthCharge?: number;
  taxRate: number;
  nominationType?: string;
  nominationFee?: number;
  discounts?: CreateDiscountData[];
  staffAssignments: CreateStaffAssignmentData[];
  processAssignments?: CreateProcessAssignmentData[];
}

export interface CreateStaffAssignmentData {
  staffId: string;
  role: 'primary' | 'assistant';
  salesRatio: number;
}

export interface CreateProcessAssignmentData {
  processId: string;
  staffId: string;
  productivityRatio: number;
  durationMinutes?: number;
}

export interface CreatePaymentData {
  paymentMethod: string;
  amount: number;
  referenceNumber?: string;
}

export interface CreateDiscountData {
  discountType: 'item' | 'global';
  discountSource: 'manual' | 'coupon' | 'ticket' | 'points';
  sourceId?: string;
  name: string;
  value: number;
  valueType: 'percentage' | 'fixed';
}

export const saleService = {
  async getById(id: string): Promise<SaleWithDetails | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        items:sale_items(
          *,
          staff_assignments:sale_item_staff_assignments(*),
          process_assignments:sale_item_process_assignments(*)
        ),
        payments:sale_payments(*),
        discounts:sale_discounts(*),
        customer:customers(*),
        store:stores(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as SaleWithDetails;
  },

  async getByDate(
    companyId: string,
    storeId: string,
    startDate: string,
    endDate: string
  ): Promise<SaleWithDetails[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        items:sale_items(
          *,
          staff_assignments:sale_item_staff_assignments(*),
          process_assignments:sale_item_process_assignments(*)
        ),
        payments:sale_payments(*),
        discounts:sale_discounts(*),
        customer:customers(*),
        store:stores(*)
      `)
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)
      .eq('status', 'completed')
      .order('sale_date', { ascending: false });

    if (error) throw error;
    return data as SaleWithDetails[] || [];
  },

  async getToday(companyId: string, storeId: string): Promise<SaleWithDetails[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getByDate(companyId, storeId, today, today);
  },

  async create(data: CreateSaleData): Promise<SaleWithDetails> {
    const supabase = getSupabaseClient();

    // Calculate totals
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    data.items.forEach((item) => {
      const itemSubtotal = (item.unitPrice + (item.hairLengthCharge || 0) + (item.nominationFee || 0)) * item.quantity;
      subtotal += itemSubtotal;

      // Item level discounts
      (item.discounts || []).forEach((discount) => {
        if (discount.valueType === 'percentage') {
          discountTotal += Math.floor(itemSubtotal * discount.value / 100);
        } else {
          discountTotal += discount.value;
        }
      });

      const taxableAmount = itemSubtotal - (item.discounts || []).reduce((sum, d) => {
        if (d.valueType === 'percentage') {
          return sum + Math.floor(itemSubtotal * d.value / 100);
        }
        return sum + d.value;
      }, 0);
      taxTotal += Math.floor(taxableAmount * item.taxRate / 100);
    });

    // Global discounts
    (data.discounts || []).forEach((discount) => {
      if (discount.valueType === 'percentage') {
        discountTotal += Math.floor(subtotal * discount.value / 100);
      } else {
        discountTotal += discount.value;
      }
    });

    const pointsUsed = data.pointsUsed || 0;
    const total = Math.max(0, subtotal - discountTotal + taxTotal - pointsUsed);
    const pointsEarned = Math.floor(total * 0.01); // 1% point return

    // Generate sale number
    const saleNumber = await this.generateSaleNumber(data.companyId);

    // Create sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        company_id: data.companyId,
        store_id: data.storeId,
        visit_id: data.visitId,
        customer_id: data.customerId,
        sale_number: saleNumber,
        sale_date: new Date().toISOString(),
        subtotal,
        discount_total: discountTotal,
        tax_total: taxTotal,
        total,
        points_used: pointsUsed,
        points_earned: pointsEarned,
        status: 'completed',
        notes: data.notes,
        created_by: data.createdBy,
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // Create sale items
    for (const item of data.items) {
      const itemSubtotal = (item.unitPrice + (item.hairLengthCharge || 0) + (item.nominationFee || 0)) * item.quantity;
      const itemDiscountAmount = (item.discounts || []).reduce((sum, d) => {
        if (d.valueType === 'percentage') {
          return sum + Math.floor(itemSubtotal * d.value / 100);
        }
        return sum + d.value;
      }, 0);
      const taxableAmount = itemSubtotal - itemDiscountAmount;
      const itemTaxAmount = Math.floor(taxableAmount * item.taxRate / 100);

      const { data: saleItem, error: itemError } = await supabase
        .from('sale_items')
        .insert({
          sale_id: sale.id,
          item_type: item.itemType,
          item_id: item.itemId,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          hair_length: item.hairLength,
          hair_length_charge: item.hairLengthCharge || 0,
          discount_amount: itemDiscountAmount,
          tax_rate: item.taxRate,
          tax_amount: itemTaxAmount,
          subtotal: taxableAmount + itemTaxAmount,
          nomination_type: item.nominationType,
          nomination_fee: item.nominationFee || 0,
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // Create staff assignments
      for (const assignment of item.staffAssignments) {
        const salesAmount = Math.floor(itemSubtotal * assignment.salesRatio);
        await supabase
          .from('sale_item_staff_assignments')
          .insert({
            sale_item_id: saleItem.id,
            staff_id: assignment.staffId,
            role: assignment.role,
            sales_ratio: assignment.salesRatio,
            sales_amount: salesAmount,
          });
      }

      // Create process assignments
      for (const process of item.processAssignments || []) {
        const productivityAmount = Math.floor(itemSubtotal * process.productivityRatio);
        await supabase
          .from('sale_item_process_assignments')
          .insert({
            sale_item_id: saleItem.id,
            process_id: process.processId,
            staff_id: process.staffId,
            productivity_ratio: process.productivityRatio,
            productivity_amount: productivityAmount,
            duration_minutes: process.durationMinutes,
          });
      }

      // Create item discounts
      for (const discount of item.discounts || []) {
        const discountAmount = discount.valueType === 'percentage'
          ? Math.floor(itemSubtotal * discount.value / 100)
          : discount.value;

        await supabase
          .from('sale_discounts')
          .insert({
            sale_id: sale.id,
            sale_item_id: saleItem.id,
            discount_type: discount.discountType,
            discount_source: discount.discountSource,
            source_id: discount.sourceId,
            name: discount.name,
            value: discount.value,
            value_type: discount.valueType,
            amount: discountAmount,
          });
      }
    }

    // Create payments
    for (const payment of data.payments) {
      await supabase
        .from('sale_payments')
        .insert({
          sale_id: sale.id,
          payment_method: payment.paymentMethod,
          amount: payment.amount,
          reference_number: payment.referenceNumber,
        });
    }

    // Create global discounts
    for (const discount of data.discounts || []) {
      const discountAmount = discount.valueType === 'percentage'
        ? Math.floor(subtotal * discount.value / 100)
        : discount.value;

      await supabase
        .from('sale_discounts')
        .insert({
          sale_id: sale.id,
          discount_type: discount.discountType,
          discount_source: discount.discountSource,
          source_id: discount.sourceId,
          name: discount.name,
          value: discount.value,
          value_type: discount.valueType,
          amount: discountAmount,
        });
    }

    // Update customer points
    if (data.customerId) {
      const { data: customer } = await supabase
        .from('customers')
        .select('points_balance')
        .eq('id', data.customerId)
        .single();

      const currentBalance = customer?.points_balance || 0;
      const newBalance = currentBalance - pointsUsed + pointsEarned;

      await supabase
        .from('customers')
        .update({
          points_balance: newBalance,
          total_spend: supabase.rpc('increment', { value: total }) as unknown as number,
        })
        .eq('id', data.customerId);

      // Record point transactions
      if (pointsUsed > 0) {
        await supabase
          .from('point_transactions')
          .insert({
            company_id: data.companyId,
            customer_id: data.customerId,
            sale_id: sale.id,
            transaction_type: 'used',
            points: -pointsUsed,
            balance_after: currentBalance - pointsUsed,
            description: `会計利用 (${saleNumber})`,
          });
      }

      if (pointsEarned > 0) {
        await supabase
          .from('point_transactions')
          .insert({
            company_id: data.companyId,
            customer_id: data.customerId,
            sale_id: sale.id,
            transaction_type: 'earned',
            points: pointsEarned,
            balance_after: newBalance,
            description: `会計付与 (${saleNumber})`,
          });
      }
    }

    // Return the complete sale
    return this.getById(sale.id) as Promise<SaleWithDetails>;
  },

  async void(id: string, reason: string, voidedBy: string): Promise<Sale> {
    const supabase = getSupabaseClient();

    // Get the sale to reverse points
    const sale = await this.getById(id);
    if (!sale) throw new Error('Sale not found');

    // Void the sale
    const { data, error } = await supabase
      .from('sales')
      .update({
        status: 'voided',
        voided_at: new Date().toISOString(),
        voided_by: voidedBy,
        void_reason: reason,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Reverse customer points
    if (sale.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('points_balance, total_spend')
        .eq('id', sale.customer_id)
        .single();

      if (customer) {
        // Add back used points, subtract earned points
        const newBalance = customer.points_balance + sale.points_used - sale.points_earned;

        await supabase
          .from('customers')
          .update({
            points_balance: newBalance,
            total_spend: customer.total_spend - sale.total,
          })
          .eq('id', sale.customer_id);

        // Record point transaction for void
        await supabase
          .from('point_transactions')
          .insert({
            company_id: sale.company_id,
            customer_id: sale.customer_id,
            sale_id: sale.id,
            transaction_type: 'adjustment',
            points: sale.points_used - sale.points_earned,
            balance_after: newBalance,
            description: `取消 (${sale.sale_number})`,
          });
      }
    }

    return data;
  },

  async generateSaleNumber(companyId: string): Promise<string> {
    const supabase = getSupabaseClient();
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    const { count } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('sale_date', `${today.toISOString().split('T')[0]}T00:00:00`)
      .lte('sale_date', `${today.toISOString().split('T')[0]}T23:59:59`);

    const sequence = String((count || 0) + 1).padStart(4, '0');
    return `${dateStr}-${sequence}`;
  },

  async getByCustomer(customerId: string, limit: number = 20): Promise<SaleWithDetails[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        items:sale_items(*),
        payments:sale_payments(*),
        discounts:sale_discounts(*),
        customer:customers(*),
        store:stores(*)
      `)
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .order('sale_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as SaleWithDetails[] || [];
  },

  async getSalesTotal(companyId: string, storeId: string, date: string): Promise<number> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sales')
      .select('total')
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('sale_date', `${date}T00:00:00`)
      .lte('sale_date', `${date}T23:59:59`);

    if (error) throw error;
    return data?.reduce((sum, s) => sum + s.total, 0) || 0;
  },

  async getSalesCount(companyId: string, storeId: string, date: string): Promise<number> {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('sale_date', `${date}T00:00:00`)
      .lte('sale_date', `${date}T23:59:59`);

    if (error) throw error;
    return count || 0;
  },

  async getDailySales(storeId: string, date: string): Promise<SaleWithDetails[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        items:sale_items(
          *,
          staff_assignments:sale_item_staff_assignments(*),
          process_assignments:sale_item_process_assignments(*)
        ),
        payments:sale_payments(*),
        discounts:sale_discounts(*),
        customer:customers(*),
        store:stores(*)
      `)
      .eq('store_id', storeId)
      .gte('sale_date', `${date}T00:00:00`)
      .lte('sale_date', `${date}T23:59:59`)
      .order('sale_date', { ascending: false });

    if (error) throw error;
    return data as SaleWithDetails[] || [];
  },

  async getVoidedSales(storeId: string, startDate: string, endDate: string): Promise<SaleWithDetails[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        items:sale_items(
          *,
          staff_assignments:sale_item_staff_assignments(*),
          process_assignments:sale_item_process_assignments(*)
        ),
        payments:sale_payments(*),
        discounts:sale_discounts(*),
        customer:customers(*),
        store:stores(*)
      `)
      .eq('store_id', storeId)
      .eq('status', 'voided')
      .gte('sale_date', `${startDate}T00:00:00`)
      .lte('sale_date', `${endDate}T23:59:59`)
      .order('voided_at', { ascending: false });

    if (error) throw error;
    return data as SaleWithDetails[] || [];
  },

  // Get staff sales and productivity
  async getStaffSales(staffId: string, startDate: string, endDate: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sale_item_staff_assignments')
      .select(`
        *,
        sale_item:sale_items(
          *,
          sale:sales(*)
        )
      `)
      .eq('staff_id', staffId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;
    return data || [];
  },

  async getStaffProductivity(staffId: string, startDate: string, endDate: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sale_item_process_assignments')
      .select(`
        *,
        process:processes(*),
        sale_item:sale_items(
          *,
          sale:sales(*)
        )
      `)
      .eq('staff_id', staffId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;
    return data || [];
  },

  // Add individual sale item
  async addItem(saleId: string, item: InsertTables<'sale_items'>): Promise<SaleItem> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sale_items')
      .insert({
        ...item,
        sale_id: saleId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Add individual payment
  async addPayment(saleId: string, payment: InsertTables<'sale_payments'>): Promise<SalePayment> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sale_payments')
      .insert({
        ...payment,
        sale_id: saleId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Simple create for single sale record (for checkout flow)
  async createSimple(sale: InsertTables<'sales'>): Promise<Sale> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sales')
      .insert(sale)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
