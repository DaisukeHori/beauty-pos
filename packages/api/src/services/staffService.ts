import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables } from '../types/database';

export type Staff = Tables<'staff'>;
export type StaffInsert = InsertTables<'staff'>;
export type StaffUpdate = UpdateTables<'staff'>;
export type StaffStore = Tables<'staff_stores'>;

export interface StaffWithStores extends Staff {
  staff_stores: (StaffStore & {
    store: Tables<'stores'>;
  })[];
}

export const staffService = {
  async getAll(companyId: string): Promise<Staff[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('company_id', companyId)
      .order('last_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getActive(companyId: string): Promise<Staff[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('last_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<StaffWithStores | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('staff')
      .select(`
        *,
        staff_stores(
          *,
          store:stores(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as StaffWithStores;
  },

  async getByStore(storeId: string): Promise<Staff[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('staff_stores')
      .select(`
        staff:staff(*)
      `)
      .eq('store_id', storeId);

    if (error) throw error;
    return data?.map((d) => d.staff).filter(Boolean) as Staff[] || [];
  },

  async create(staff: StaffInsert): Promise<Staff> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('staff')
      .insert(staff)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: StaffUpdate): Promise<Staff> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('staff')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  async assignToStore(staffId: string, storeId: string, isPrimary: boolean = false): Promise<void> {
    const supabase = getSupabaseClient();

    // If setting as primary, unset other primaries first
    if (isPrimary) {
      await supabase
        .from('staff_stores')
        .update({ is_primary: false })
        .eq('staff_id', staffId);
    }

    const { error } = await supabase
      .from('staff_stores')
      .upsert({
        staff_id: staffId,
        store_id: storeId,
        is_primary: isPrimary,
      }, {
        onConflict: 'staff_id,store_id',
      });

    if (error) throw error;
  },

  async removeFromStore(staffId: string, storeId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('staff_stores')
      .delete()
      .eq('staff_id', staffId)
      .eq('store_id', storeId);

    if (error) throw error;
  },

  async getStaffStores(staffId: string): Promise<StaffStore[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('staff_stores')
      .select(`
        *,
        store:stores(*)
      `)
      .eq('staff_id', staffId);

    if (error) throw error;
    return data || [];
  },

  async updateNominationFee(id: string, fee: number): Promise<Staff> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('staff')
      .update({ nomination_fee: fee })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async uploadAvatar(id: string, file: File): Promise<string> {
    const supabase = getSupabaseClient();

    const fileExt = file.name.split('.').pop();
    const filePath = `staff/${id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    await supabase
      .from('staff')
      .update({ avatar_url: data.publicUrl })
      .eq('id', id);

    return data.publicUrl;
  },

  async generateEmployeeCode(companyId: string): Promise<string> {
    const supabase = getSupabaseClient();
    const { count } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const nextNumber = (count || 0) + 1;
    return `EMP${String(nextNumber).padStart(4, '0')}`;
  },
};
