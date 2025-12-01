import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables } from '../types/database';

export type Product = Tables<'products'>;
export type ProductInsert = InsertTables<'products'>;
export type ProductUpdate = UpdateTables<'products'>;

export const productService = {
  async getAll(companyId: string, storeId: string): Promise<Product[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getActive(companyId: string, storeId: string): Promise<Product[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Product | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getByBarcode(barcode: string, companyId: string): Promise<Product | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .eq('company_id', companyId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getByCategory(companyId: string, storeId: string, category: string): Promise<Product[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .eq('category', category)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getLowStock(companyId: string, storeId: string): Promise<Product[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .filter('stock_quantity', 'lte', 'min_stock_quantity');

    if (error) throw error;
    return data || [];
  },

  async create(product: ProductInsert): Promise<Product> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: ProductUpdate): Promise<Product> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
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
      .from('products')
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async adjustStock(id: string, quantity: number, reason: string): Promise<Product> {
    const supabase = getSupabaseClient();

    // Get current stock
    const { data: product, error: getError } = await supabase
      .from('products')
      .select('stock_quantity, company_id, store_id')
      .eq('id', id)
      .single();

    if (getError) throw getError;

    const newQuantity = (product.stock_quantity || 0) + quantity;

    // Update stock
    const { data, error } = await supabase
      .from('products')
      .update({ stock_quantity: newQuantity })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log stock movement
    await supabase
      .from('stock_movements')
      .insert({
        company_id: product.company_id,
        store_id: product.store_id,
        product_id: id,
        movement_type: quantity > 0 ? 'in' : 'out',
        quantity: Math.abs(quantity),
        quantity_after: newQuantity,
        reason,
        created_at: new Date().toISOString(),
      });

    return data;
  },

  async search(companyId: string, storeId: string, query: string): Promise<Product[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,barcode.ilike.%${query}%,brand.ilike.%${query}%`)
      .order('name', { ascending: true })
      .limit(20);

    if (error) throw error;
    return data || [];
  },

  async getCategories(companyId: string): Promise<string[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (error) throw error;

    const categories = [...new Set(data?.map(p => p.category).filter(Boolean))];
    return categories as string[];
  },
};
