import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables } from '../types/database';

export type Company = Tables<'companies'>;
export type CompanyInsert = InsertTables<'companies'>;
export type CompanyUpdate = UpdateTables<'companies'>;

export const companyService = {
  async getById(id: string): Promise<Company | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: CompanyUpdate): Promise<Company> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSettings(id: string, settings: Record<string, unknown>): Promise<Company> {
    const supabase = getSupabaseClient();

    // Get current settings and merge
    const { data: current } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', id)
      .single();

    const mergedSettings = {
      ...(current?.settings as Record<string, unknown> || {}),
      ...settings,
    };

    const { data, error } = await supabase
      .from('companies')
      .update({ settings: mergedSettings })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async uploadLogo(id: string, file: File): Promise<string> {
    const supabase = getSupabaseClient();

    const fileExt = file.name.split('.').pop();
    const filePath = `${id}/logo.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('company-assets')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('company-assets')
      .getPublicUrl(filePath);

    // Update company with logo URL
    await supabase
      .from('companies')
      .update({ logo_url: data.publicUrl })
      .eq('id', id);

    return data.publicUrl;
  },

  async getSubscriptionStatus(id: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('company_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
};
