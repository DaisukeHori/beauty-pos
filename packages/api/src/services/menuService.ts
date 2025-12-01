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
    const { data, error } = await (supabase
      .from('menu_categories') as ReturnType<typeof supabase.from>)
      .insert(category as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return data as MenuCategory;
  },

  async updateCategory(id: string, updates: UpdateTables<'menu_categories'>): Promise<MenuCategory> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('menu_categories') as ReturnType<typeof supabase.from>)
      .update(updates as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as MenuCategory;
  },

  async deleteCategory(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await (supabase
      .from('menu_categories') as ReturnType<typeof supabase.from>)
      .update({ is_active: false } as Record<string, unknown>)
      .eq('id', id);

    if (error) throw error;
  },

  async reorderCategories(companyId: string, categoryIds: string[]): Promise<void> {
    const supabase = getSupabaseClient();

    for (let i = 0; i < categoryIds.length; i++) {
      await (supabase
        .from('menu_categories') as ReturnType<typeof supabase.from>)
        .update({ sort_order: i } as Record<string, unknown>)
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

  async getActive(companyId: string, storeId?: string): Promise<Menu[]> {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('menus')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (storeId) {
      query = query.or(`store_id.eq.${storeId},store_id.is.null`);
    }

    const { data, error } = await query.order('sort_order', { ascending: true });

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
    const { data, error } = await (supabase
      .from('menus') as ReturnType<typeof supabase.from>)
      .insert(menu as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return data as Menu;
  },

  async update(id: string, updates: UpdateTables<'menus'>): Promise<Menu> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('menus') as ReturnType<typeof supabase.from>)
      .update(updates as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Menu;
  },

  async delete(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await (supabase
      .from('menus') as ReturnType<typeof supabase.from>)
      .update({ is_active: false } as Record<string, unknown>)
      .eq('id', id);

    if (error) throw error;
  },

  async reorderMenus(categoryId: string, menuIds: string[]): Promise<void> {
    const supabase = getSupabaseClient();

    for (let i = 0; i < menuIds.length; i++) {
      await (supabase
        .from('menus') as ReturnType<typeof supabase.from>)
        .update({ sort_order: i } as Record<string, unknown>)
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
    const { data, error } = await (supabase
      .from('processes') as ReturnType<typeof supabase.from>)
      .insert(process as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return data as Process;
  },

  async updateProcess(id: string, updates: UpdateTables<'processes'>): Promise<Process> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('processes') as ReturnType<typeof supabase.from>)
      .update(updates as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Process;
  },

  async deleteProcess(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await (supabase
      .from('processes') as ReturnType<typeof supabase.from>)
      .update({ is_active: false } as Record<string, unknown>)
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

      const { error } = await (supabase
        .from('menu_processes') as ReturnType<typeof supabase.from>)
        .insert(associations as unknown as Record<string, unknown>[]);

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
