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
    const staffData = data as Array<{ staff: Staff }> | null;
    return staffData?.map((d) => d.staff).filter(Boolean) as Staff[] || [];
  },

  async create(staff: StaffInsert): Promise<Staff> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('staff') as ReturnType<typeof supabase.from>)
      .insert(staff as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return data as Staff;
  },

  async update(id: string, updates: StaffUpdate): Promise<Staff> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('staff') as ReturnType<typeof supabase.from>)
      .update(updates as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Staff;
  },

  async delete(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await (supabase
      .from('staff') as ReturnType<typeof supabase.from>)
      .update({ is_active: false } as Record<string, unknown>)
      .eq('id', id);

    if (error) throw error;
  },

  async assignToStore(staffId: string, storeId: string, isPrimary: boolean = false): Promise<void> {
    const supabase = getSupabaseClient();

    // If setting as primary, unset other primaries first
    if (isPrimary) {
      await (supabase
        .from('staff_stores') as ReturnType<typeof supabase.from>)
        .update({ is_primary: false } as Record<string, unknown>)
        .eq('staff_id', staffId);
    }

    const { error } = await (supabase
      .from('staff_stores') as ReturnType<typeof supabase.from>)
      .upsert({
        staff_id: staffId,
        store_id: storeId,
        is_primary: isPrimary,
      } as Record<string, unknown>, {
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
    const { data, error } = await (supabase
      .from('staff') as ReturnType<typeof supabase.from>)
      .update({ nomination_fee: fee } as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Staff;
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

    await (supabase
      .from('staff') as ReturnType<typeof supabase.from>)
      .update({ avatar_url: data.publicUrl } as Record<string, unknown>)
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
