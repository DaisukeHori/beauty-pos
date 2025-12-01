import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables } from '../types/database';

export type Reservation = Tables<'reservations'>;
export type ReservationInsert = InsertTables<'reservations'>;
export type ReservationUpdate = UpdateTables<'reservations'>;

export interface ReservationWithDetails extends Reservation {
  customer?: Tables<'customers'> | null;
  staff?: Tables<'staff'> | null;
  store?: Tables<'stores'> | null;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  staffId?: string;
}

export interface ReservationSearchParams {
  companyId: string;
  storeId?: string;
  staffId?: string;
  customerId?: string;
  startDate: string;
  endDate: string;
  status?: string[];
}

export const reservationService = {
  async search(params: ReservationSearchParams): Promise<ReservationWithDetails[]> {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('reservations')
      .select(`
        *,
        customer:customers(*),
        staff:staff(*),
        store:stores(*)
      `)
      .eq('company_id', params.companyId)
      .gte('start_time', params.startDate)
      .lte('start_time', params.endDate);

    if (params.storeId) {
      query = query.eq('store_id', params.storeId);
    }
    if (params.staffId) {
      query = query.eq('staff_id', params.staffId);
    }
    if (params.customerId) {
      query = query.eq('customer_id', params.customerId);
    }
    if (params.status && params.status.length > 0) {
      query = query.in('status', params.status);
    }

    const { data, error } = await query.order('start_time', { ascending: true });

    if (error) throw error;
    return data as ReservationWithDetails[] || [];
  },

  async getById(id: string): Promise<ReservationWithDetails | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        customer:customers(*),
        staff:staff(*),
        store:stores(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as ReservationWithDetails;
  },

  async getByDate(companyId: string, storeId: string, date: string): Promise<ReservationWithDetails[]> {
    const supabase = getSupabaseClient();
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        customer:customers(*),
        staff:staff(*),
        store:stores(*)
      `)
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)
      .not('status', 'eq', 'cancelled')
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data as ReservationWithDetails[] || [];
  },

  async create(reservation: ReservationInsert): Promise<Reservation> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('reservations')
      .insert(reservation)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: ReservationUpdate): Promise<Reservation> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async cancel(id: string, reason?: string): Promise<Reservation> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('reservations')
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

  async confirm(id: string): Promise<Reservation> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('reservations')
      .update({ status: 'confirmed' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async checkIn(id: string): Promise<Reservation> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('reservations')
      .update({ status: 'checked_in' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAvailableSlots(
    companyId: string,
    storeId: string,
    staffId: string | null,
    date: string,
    durationMinutes: number
  ): Promise<TimeSlot[]> {
    const supabase = getSupabaseClient();

    // Get store business hours
    const { data: store } = await supabase
      .from('stores')
      .select('business_hours')
      .eq('id', storeId)
      .single();

    const businessHours = store?.business_hours as Record<string, { open: string; close: string }> | undefined;
    const dayOfWeek = new Date(date).getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayConfig = businessHours?.[dayNames[dayOfWeek]];

    if (!dayConfig) return [];

    // Get existing reservations for the day
    let query = supabase
      .from('reservations')
      .select('start_time, end_time, staff_id')
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .gte('start_time', `${date}T00:00:00`)
      .lte('start_time', `${date}T23:59:59`)
      .not('status', 'in', '("cancelled","no_show")');

    if (staffId) {
      query = query.eq('staff_id', staffId);
    }

    const { data: reservations } = await query;

    // Generate available time slots
    const slots: TimeSlot[] = [];
    const intervalMinutes = 30;

    const parseTime = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const formatTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    const openMinutes = parseTime(dayConfig.open);
    const closeMinutes = parseTime(dayConfig.close);

    for (let time = openMinutes; time + durationMinutes <= closeMinutes; time += intervalMinutes) {
      const startTime = `${date}T${formatTime(time)}:00`;
      const endTime = `${date}T${formatTime(time + durationMinutes)}:00`;

      // Check if slot conflicts with existing reservations
      const isConflict = reservations?.some((r) => {
        const rStart = new Date(r.start_time).getTime();
        const rEnd = new Date(r.end_time).getTime();
        const sStart = new Date(startTime).getTime();
        const sEnd = new Date(endTime).getTime();
        return sStart < rEnd && sEnd > rStart;
      });

      slots.push({
        startTime,
        endTime,
        available: !isConflict,
        staffId: staffId || undefined,
      });
    }

    return slots;
  },

  async getUpcoming(companyId: string, storeId: string, limit: number = 10): Promise<ReservationWithDetails[]> {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        customer:customers(*),
        staff:staff(*),
        store:stores(*)
      `)
      .eq('company_id', companyId)
      .eq('store_id', storeId)
      .gte('start_time', now)
      .in('status', ['pending', 'confirmed'])
      .order('start_time', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data as ReservationWithDetails[] || [];
  },

  async getTodayReservations(companyId: string, storeId: string): Promise<ReservationWithDetails[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getByDate(companyId, storeId, today);
  },

  async sendReminder(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    await supabase
      .from('reservations')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', id);
  },

  async noShow(id: string): Promise<Reservation> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('reservations')
      .update({ status: 'no_show' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
