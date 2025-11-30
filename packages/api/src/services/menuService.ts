import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables } from '../types/database';

export type MenuCategory = Tables<'menu_categories'>;
export type Menu = Tables<'menus'>;
export type Process = Tables<'processes'>;
export type MenuProcess = Tables<'menu_processes'>;

export interface MenuWithDetails extends Menu {
  category?: MenuCategory | null;
  processes?: (MenuProcess & { process: Process })[];
}

export const menuService = {
  // Categories
  async getCategories(companyId: string): Promise<MenuCategory[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createCategory(category: InsertTables<'menu_categories'>): Promise<MenuCategory> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('menu_categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCategory(id: string, updates: UpdateTables<'menu_categories'>): Promise<MenuCategory> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('menu_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCategory(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('menu_categories')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  async reorderCategories(companyId: string, categoryIds: string[]): Promise<void> {
    const supabase = getSupabaseClient();

    for (let i = 0; i < categoryIds.length; i++) {
      await supabase
        .from('menu_categories')
        .update({ sort_order: i })
        .eq('id', categoryIds[i])
        .eq('company_id', companyId);
    }
  },

  // Menus
  async getAll(companyId: string): Promise<Menu[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('menus')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getByCategory(categoryId: string): Promise<Menu[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('menus')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<MenuWithDetails | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('menus')
      .select(`
        *,
        category:menu_categories(*),
        processes:menu_processes(
          *,
          process:processes(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as MenuWithDetails;
  },

  async create(menu: InsertTables<'menus'>): Promise<Menu> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('menus')
      .insert(menu)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: UpdateTables<'menus'>): Promise<Menu> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('menus')
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
      .from('menus')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  async reorderMenus(categoryId: string, menuIds: string[]): Promise<void> {
    const supabase = getSupabaseClient();

    for (let i = 0; i < menuIds.length; i++) {
      await supabase
        .from('menus')
        .update({ sort_order: i })
        .eq('id', menuIds[i])
        .eq('category_id', categoryId);
    }
  },

  // Processes
  async getProcesses(companyId: string): Promise<Process[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('processes')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createProcess(process: InsertTables<'processes'>): Promise<Process> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('processes')
      .insert(process)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProcess(id: string, updates: UpdateTables<'processes'>): Promise<Process> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('processes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProcess(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('processes')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  // Menu-Process associations
  async setMenuProcesses(menuId: string, processIds: string[]): Promise<void> {
    const supabase = getSupabaseClient();

    // Delete existing associations
    await supabase
      .from('menu_processes')
      .delete()
      .eq('menu_id', menuId);

    // Create new associations
    if (processIds.length > 0) {
      const associations = processIds.map((processId, index) => ({
        menu_id: menuId,
        process_id: processId,
        sort_order: index,
      }));

      const { error } = await supabase
        .from('menu_processes')
        .insert(associations);

      if (error) throw error;
    }
  },

  async getMenuProcesses(menuId: string): Promise<(MenuProcess & { process: Process })[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('menu_processes')
      .select(`
        *,
        process:processes(*)
      `)
      .eq('menu_id', menuId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data as (MenuProcess & { process: Process })[] || [];
  },

  // Menu code generation
  async generateMenuCode(companyId: string): Promise<string> {
    const supabase = getSupabaseClient();
    const { count } = await supabase
      .from('menus')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const nextNumber = (count || 0) + 1;
    return `M${String(nextNumber).padStart(4, '0')}`;
  },

  async generateProcessCode(companyId: string): Promise<string> {
    const supabase = getSupabaseClient();
    const { count } = await supabase
      .from('processes')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const nextNumber = (count || 0) + 1;
    return `P${String(nextNumber).padStart(4, '0')}`;
  },

  // Get menus eligible for tickets/coupons
  async getTicketEligibleMenus(companyId: string): Promise<Menu[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('menus')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .eq('is_ticket_eligible', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getCouponEligibleMenus(companyId: string): Promise<Menu[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('menus')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .eq('is_coupon_eligible', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },
};
