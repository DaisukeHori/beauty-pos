import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables } from '../types/database';

export type Store = Tables<'stores'>;
export type StoreInsert = InsertTables<'stores'>;
export type StoreUpdate = UpdateTables<'stores'>;

export const storeService = {
  async getAll(companyId: string): Promise<Store[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('company_id', companyId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Store | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getActive(companyId: string): Promise<Store[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(store: StoreInsert): Promise<Store> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('stores') as ReturnType<typeof supabase.from>)
      .insert(store as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return data as Store;
  },

  async update(id: string, updates: StoreUpdate): Promise<Store> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('stores') as ReturnType<typeof supabase.from>)
      .update(updates as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Store;
  },

  async delete(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await (supabase
      .from('stores') as ReturnType<typeof supabase.from>)
      .update({ is_active: false } as Record<string, unknown>)
      .eq('id', id);

    if (error) throw error;
  },

  async updateBusinessHours(id: string, businessHours: Record<string, unknown>): Promise<Store> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('stores') as ReturnType<typeof supabase.from>)
      .update({ business_hours: businessHours } as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Store;
  },

  async updateHolidays(id: string, holidays: unknown[]): Promise<Store> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('stores') as ReturnType<typeof supabase.from>)
      .update({ holidays } as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Store;
  },

  async reorder(companyId: string, storeIds: string[]): Promise<void> {
    const supabase = getSupabaseClient();

    const updates = storeIds.map((id, index) => ({
      id,
      sort_order: index,
    }));

    for (const update of updates) {
      await (supabase
        .from('stores') as ReturnType<typeof supabase.from>)
        .update({ sort_order: update.sort_order } as Record<string, unknown>)
        .eq('id', update.id)
        .eq('company_id', companyId);
    }
  },
};
