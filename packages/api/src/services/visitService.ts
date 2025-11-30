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
    const { data, error } = await supabase
      .from('visits')
      .insert({
        ...visit,
        status: 'checked_in',
        check_in_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // If there's a reservation, update its status
    if (visit.reservation_id) {
      await supabase
        .from('reservations')
        .update({ status: 'checked_in' })
        .eq('id', visit.reservation_id);
    }

    return data;
  },

  async startService(id: string): Promise<Visit> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('visits')
      .update({
        status: 'in_service',
        service_start_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async endService(id: string): Promise<Visit> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('visits')
      .update({
        service_end_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async checkOut(id: string): Promise<Visit> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('visits')
      .update({
        status: 'completed',
        check_out_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update customer stats
    if (data.customer_id) {
      await supabase.rpc('increment_customer_visits', {
        customer_id: data.customer_id,
      }).catch(() => {
        // If RPC doesn't exist, do it manually
        return supabase
          .from('customers')
          .update({
            total_visits: supabase.rpc('increment', { value: 1 }) as unknown as number,
            last_visit_at: new Date().toISOString(),
          })
          .eq('id', data.customer_id);
      });
    }

    return data;
  },

  async cancel(id: string, reason?: string): Promise<Visit> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('visits')
      .update({
        status: 'cancelled',
        notes: reason,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async noShow(id: string): Promise<Visit> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('visits')
      .update({ status: 'no_show' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: VisitUpdate): Promise<Visit> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('visits')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
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
