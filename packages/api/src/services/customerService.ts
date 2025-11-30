import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables } from '../types/database';

export type Customer = Tables<'customers'>;
export type CustomerInsert = InsertTables<'customers'>;
export type CustomerUpdate = UpdateTables<'customers'>;
export type CustomerKarte = Tables<'customer_kartes'>;
export type CustomerPhoto = Tables<'customer_photos'>;
export type ColorRecipe = Tables<'color_recipes'>;
export type PermRecipe = Tables<'perm_recipes'>;

export interface CustomerWithDetails extends Customer {
  karte?: CustomerKarte | null;
  photos?: CustomerPhoto[];
  color_recipes?: ColorRecipe[];
  perm_recipes?: PermRecipe[];
  preferred_staff?: Tables<'staff'> | null;
}

export interface CustomerSearchParams {
  companyId: string;
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const customerService = {
  async search(params: CustomerSearchParams): Promise<{ data: Customer[]; total: number }> {
    const supabase = getSupabaseClient();
    const { companyId, query, page = 1, limit = 20, sortBy = 'last_name', sortOrder = 'asc' } = params;

    let queryBuilder = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (query) {
      queryBuilder = queryBuilder.or(
        `last_name.ilike.%${query}%,first_name.ilike.%${query}%,last_name_kana.ilike.%${query}%,first_name_kana.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,customer_code.ilike.%${query}%`
      );
    }

    queryBuilder = queryBuilder
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    const { data, error, count } = await queryBuilder;

    if (error) throw error;
    return { data: data || [], total: count || 0 };
  },

  async getAll(companyId: string): Promise<Customer[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('last_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<CustomerWithDetails | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        karte:customer_kartes(*),
        photos:customer_photos(*),
        color_recipes(*),
        perm_recipes(*),
        preferred_staff:staff(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as CustomerWithDetails;
  },

  async getByPhone(companyId: string, phone: string): Promise<Customer | null> {
    const supabase = getSupabaseClient();
    const normalizedPhone = phone.replace(/\D/g, '');
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', companyId)
      .eq('phone', normalizedPhone)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async create(customer: CustomerInsert): Promise<Customer> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('customers')
      .insert(customer)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: CustomerUpdate): Promise<Customer> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('customers')
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
      .from('customers')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  // Karte operations
  async getKarte(customerId: string): Promise<CustomerKarte | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('customer_kartes')
      .select('*')
      .eq('customer_id', customerId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async upsertKarte(customerId: string, karte: Partial<CustomerKarte>): Promise<CustomerKarte> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('customer_kartes')
      .upsert({
        customer_id: customerId,
        ...karte,
      }, {
        onConflict: 'customer_id',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Photo operations
  async getPhotos(customerId: string): Promise<CustomerPhoto[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('customer_photos')
      .select('*')
      .eq('customer_id', customerId)
      .order('taken_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async uploadPhoto(customerId: string, file: File, photoType: string, visitId?: string): Promise<CustomerPhoto> {
    const supabase = getSupabaseClient();

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `customers/${customerId}/photos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('customer-photos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('customer-photos')
      .getPublicUrl(filePath);

    const { data, error } = await supabase
      .from('customer_photos')
      .insert({
        customer_id: customerId,
        visit_id: visitId,
        photo_type: photoType,
        photo_url: urlData.publicUrl,
        taken_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletePhoto(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('customer_photos')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Color recipe operations
  async getColorRecipes(customerId: string): Promise<ColorRecipe[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('color_recipes')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createColorRecipe(recipe: InsertTables<'color_recipes'>): Promise<ColorRecipe> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('color_recipes')
      .insert(recipe)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateColorRecipe(id: string, updates: UpdateTables<'color_recipes'>): Promise<ColorRecipe> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('color_recipes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Perm recipe operations
  async getPermRecipes(customerId: string): Promise<PermRecipe[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('perm_recipes')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createPermRecipe(recipe: InsertTables<'perm_recipes'>): Promise<PermRecipe> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('perm_recipes')
      .insert(recipe)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePermRecipe(id: string, updates: UpdateTables<'perm_recipes'>): Promise<PermRecipe> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('perm_recipes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Points operations
  async getPoints(customerId: string): Promise<number> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('customers')
      .select('points_balance')
      .eq('id', customerId)
      .single();

    if (error) throw error;
    return data?.points_balance || 0;
  },

  async getPointHistory(customerId: string, limit: number = 50): Promise<Tables<'point_transactions'>[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  // Statistics
  async getVisitHistory(customerId: string, limit: number = 20): Promise<Tables<'visits'>[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('visits')
      .select(`
        *,
        staff:staff(*),
        store:stores(*)
      `)
      .eq('customer_id', customerId)
      .order('check_in_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getSalesHistory(customerId: string, limit: number = 20): Promise<Tables<'sales'>[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        items:sale_items(*)
      `)
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .order('sale_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async generateCustomerCode(companyId: string): Promise<string> {
    const supabase = getSupabaseClient();
    const { count } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const nextNumber = (count || 0) + 1;
    return `C${String(nextNumber).padStart(6, '0')}`;
  },
};
