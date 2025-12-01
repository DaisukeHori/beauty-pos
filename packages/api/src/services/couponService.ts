import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables } from '../types/database';

export type Coupon = Tables<'coupons'>;
export type CouponInsert = InsertTables<'coupons'>;
export type CouponUpdate = UpdateTables<'coupons'>;
export type CouponUsage = Tables<'coupon_usages'>;

export interface CouponWithUsages extends Coupon {
  usages?: CouponUsage[];
}

export const couponService = {
  async getAll(companyId: string): Promise<Coupon[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getActive(companyId: string): Promise<Coupon[]> {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .lte('valid_from', now)
      .or(`valid_until.is.null,valid_until.gte.${now}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<CouponWithUsages | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('coupons')
      .select(`
        *,
        usages:coupon_usages(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as CouponWithUsages;
  },

  async getByCode(companyId: string, code: string): Promise<Coupon | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('company_id', companyId)
      .eq('code', code.toUpperCase())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async create(coupon: CouponInsert): Promise<Coupon> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('coupons') as ReturnType<typeof supabase.from>)
      .insert({
        ...coupon,
        code: coupon.code.toUpperCase(),
      } as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return data as Coupon;
  },

  async update(id: string, updates: CouponUpdate): Promise<Coupon> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('coupons') as ReturnType<typeof supabase.from>)
      .update(updates as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Coupon;
  },

  async delete(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await (supabase
      .from('coupons') as ReturnType<typeof supabase.from>)
      .update({ is_active: false } as Record<string, unknown>)
      .eq('id', id);

    if (error) throw error;
  },

  async validate(
    companyId: string,
    code: string,
    customerId?: string,
    subtotal?: number,
    menuIds?: string[]
  ): Promise<{ valid: boolean; coupon?: Coupon; error?: string }> {
    const supabase = getSupabaseClient();
    const now = new Date();

    const { data: couponData, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('company_id', companyId)
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !couponData) {
      return { valid: false, error: 'クーポンコードが見つかりません' };
    }

    const coupon = couponData as Coupon;

    // Check validity period
    if (new Date(coupon.valid_from) > now) {
      return { valid: false, error: 'クーポンの利用期間前です' };
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return { valid: false, error: 'クーポンの有効期限が切れています' };
    }

    // Check max uses
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return { valid: false, error: 'クーポンの利用上限に達しています' };
    }

    // Check single use per customer
    if (coupon.is_single_use && customerId) {
      const { count } = await supabase
        .from('coupon_usages')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('customer_id', customerId);

      if (count && count > 0) {
        return { valid: false, error: 'このクーポンは既に使用済みです' };
      }
    }

    // Check minimum purchase amount
    if (coupon.min_purchase_amount !== null && subtotal !== undefined) {
      if (subtotal < coupon.min_purchase_amount) {
        return {
          valid: false,
          error: `最低購入金額（¥${coupon.min_purchase_amount.toLocaleString()}）に達していません`,
        };
      }
    }

    // Check applicable menus
    const applicableMenuIds = coupon.applicable_menu_ids as string[] | null;
    if (applicableMenuIds && applicableMenuIds.length > 0 && menuIds) {
      const hasApplicableMenu = menuIds.some((id) => applicableMenuIds.includes(id));
      if (!hasApplicableMenu) {
        return { valid: false, error: 'このクーポンは選択したメニューに適用できません' };
      }
    }

    return { valid: true, coupon };
  },

  async use(
    couponId: string,
    customerId: string | null,
    saleId: string,
    discountAmount: number
  ): Promise<CouponUsage> {
    const supabase = getSupabaseClient();

    // Create usage record
    const { data: usage, error: usageError } = await (supabase
      .from('coupon_usages') as ReturnType<typeof supabase.from>)
      .insert({
        coupon_id: couponId,
        customer_id: customerId,
        sale_id: saleId,
        discount_amount: discountAmount,
        used_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .select()
      .single();

    if (usageError) throw usageError;

    // Increment used count
    const { data: couponData } = await supabase
      .from('coupons')
      .select('used_count')
      .eq('id', couponId)
      .single();

    const coupon = couponData as { used_count?: number } | null;
    await (supabase
      .from('coupons') as ReturnType<typeof supabase.from>)
      .update({ used_count: (coupon?.used_count || 0) + 1 } as Record<string, unknown>)
      .eq('id', couponId);

    return usage as CouponUsage;
  },

  async calculateDiscount(coupon: Coupon, subtotal: number): Promise<number> {
    let discount = 0;

    if (coupon.discount_type === 'percentage') {
      discount = Math.floor(subtotal * coupon.discount_value / 100);
    } else {
      discount = coupon.discount_value;
    }

    // Apply max discount if set
    if (coupon.max_discount_amount !== null && discount > coupon.max_discount_amount) {
      discount = coupon.max_discount_amount;
    }

    // Cannot exceed subtotal
    return Math.min(discount, subtotal);
  },

  async generateCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  async getUsageHistory(couponId: string): Promise<CouponUsage[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('coupon_usages')
      .select(`
        *,
        customer:customers(*),
        sale:sales(*)
      `)
      .eq('coupon_id', couponId)
      .order('used_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
