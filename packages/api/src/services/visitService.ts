import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables } from '../types/database';

export type Visit = Tables<'visits'>;
export type VisitInsert = InsertTables<'visits'>;
export type VisitUpdate = UpdateTables<'visits'>;

export interface VisitWithDetails extends Visit {
  customer?: Tables<'customers'> | null;
  staff?: Tables<'staff'> | null;
  store?: Tables<'stores'> | null;
  reservation?: Tables<'reservations'> | null;
}

export const visitService = {
  async getById(id: string): Promise<VisitWithDetails | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('visits')
      .select(`
        *,
        customer:customers(*),
        staff:staff(*),
        store:stores(*),
        reservation:reservations(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as VisitWithDetails;
  },

  async getToday(companyId: string, storeId: string): Promise<VisitWithDetails[]> {
    const supabase = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('visits')
      .select(`
        *,
        customer:customers(*),
        staff:staff(*),
        store:stores(*)
      `)
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .gte('check_in_at', `${today}T00:00:00`)
      .lte('check_in_at', `${today}T23:59:59`)
      .order('check_in_at', { ascending: true });

    if (error) throw error;
    return data as VisitWithDetails[] || [];
  },

  async getActive(companyId: string, storeId: string): Promise<VisitWithDetails[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('visits')
      .select(`
        *,
        customer:customers(*),
        staff:staff(*),
        store:stores(*)
      `)
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .in('status', ['checked_in', 'in_service'])
      .order('check_in_at', { ascending: true });

    if (error) throw error;
    return data as VisitWithDetails[] || [];
  },

  async checkIn(visit: VisitInsert): Promise<Visit> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('visits') as ReturnType<typeof supabase.from>)
      .insert({
        ...visit,
        status: 'checked_in',
        check_in_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;

    // If there's a reservation, update its status
    if (visit.reservation_id) {
      await (supabase
        .from('reservations') as ReturnType<typeof supabase.from>)
        .update({ status: 'checked_in' } as Record<string, unknown>)
        .eq('id', visit.reservation_id);
    }

    return data as Visit;
  },

  async startService(id: string): Promise<Visit> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('visits') as ReturnType<typeof supabase.from>)
      .update({
        status: 'in_service',
        service_start_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Visit;
  },

  async endService(id: string): Promise<Visit> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('visits') as ReturnType<typeof supabase.from>)
      .update({
        service_end_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Visit;
  },

  async checkOut(id: string): Promise<Visit> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('visits') as ReturnType<typeof supabase.from>)
      .update({
        status: 'completed',
        check_out_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const visitData = data as Visit;

    // Update customer stats
    if (visitData.customer_id) {
      try {
        // Try RPC first
        await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<unknown>)(
          'increment_customer_visits',
          { customer_id: visitData.customer_id }
        );
      } catch {
        // If RPC doesn't exist, manually update the customer
        const { data: customer } = await supabase
          .from('customers')
          .select('total_visits')
          .eq('id', visitData.customer_id)
          .single() as { data: { total_visits?: number } | null; error: unknown };

        await (supabase
          .from('customers') as ReturnType<typeof supabase.from>)
          .update({
            total_visits: (customer?.total_visits || 0) + 1,
            last_visit_at: new Date().toISOString(),
          } as Record<string, unknown>)
          .eq('id', visitData.customer_id);
      }
    }

    return visitData;
  },

  async cancel(id: string, reason?: string): Promise<Visit> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('visits') as ReturnType<typeof supabase.from>)
      .update({
        status: 'cancelled',
        notes: reason,
      } as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Visit;
  },

  async noShow(id: string): Promise<Visit> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('visits') as ReturnType<typeof supabase.from>)
      .update({ status: 'no_show' } as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Visit;
  },

  async update(id: string, updates: VisitUpdate): Promise<Visit> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('visits') as ReturnType<typeof supabase.from>)
      .update(updates as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Visit;
  },

  async getByCustomer(customerId: string, limit: number = 20): Promise<VisitWithDetails[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('visits')
      .select(`
        *,
        customer:customers(*),
        staff:staff(*),
        store:stores(*)
      `)
      .eq('customer_id', customerId)
      .order('check_in_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as VisitWithDetails[] || [];
  },

  async getByStaff(staffId: string, date: string): Promise<VisitWithDetails[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('visits')
      .select(`
        *,
        customer:customers(*),
        staff:staff(*),
        store:stores(*)
      `)
      .eq('staff_id', staffId)
      .gte('check_in_at', `${date}T00:00:00`)
      .lte('check_in_at', `${date}T23:59:59`)
      .order('check_in_at', { ascending: true });

    if (error) throw error;
    return data as VisitWithDetails[] || [];
  },

  async getWaitingCount(companyId: string, storeId: string): Promise<number> {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .eq('status', 'checked_in');

    if (error) throw error;
    return count || 0;
  },

  async getInServiceCount(companyId: string, storeId: string): Promise<number> {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .eq('status', 'in_service');

    if (error) throw error;
    return count || 0;
  },
};
