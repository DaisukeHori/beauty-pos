import { getSupabaseClient } from '../client';

export interface Shift {
  id: string;
  company_id: string;
  store_id: string;
  staff_id: string;
  date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  status: 'scheduled' | 'confirmed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

export interface ShiftInsert {
  company_id: string;
  store_id: string;
  staff_id: string;
  date: string;
  start_time: string;
  end_time: string;
  break_minutes?: number;
  status?: 'scheduled' | 'confirmed' | 'cancelled';
  notes?: string;
}

export interface ShiftUpdate {
  start_time?: string;
  end_time?: string;
  break_minutes?: number;
  status?: 'scheduled' | 'confirmed' | 'cancelled';
  notes?: string;
}

export interface Attendance {
  id: string;
  company_id: string;
  store_id: string;
  staff_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
  total_break_minutes: number;
  total_work_minutes: number;
  status: 'clocked_in' | 'on_break' | 'clocked_out' | 'absent';
  notes: string | null;
  created_at: string;
  updated_at: string;
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

export interface AttendanceInsert {
  company_id: string;
  store_id: string;
  staff_id: string;
  date: string;
  clock_in?: string;
  notes?: string;
}

export interface AttendanceUpdate {
  clock_in?: string;
  clock_out?: string;
  break_start?: string;
  break_end?: string;
  total_break_minutes?: number;
  total_work_minutes?: number;
  status?: 'clocked_in' | 'on_break' | 'clocked_out' | 'absent';
  notes?: string;
}

// Shift Service
export const shiftService = {
  // Get shifts for a date range
  async getByDateRange(
    storeId: string,
    startDate: string,
    endDate: string
  ): Promise<Shift[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('shifts')
      .select(`
        *,
        staff:staff_id (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('store_id', storeId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data as Shift[];
  },

  // Get shifts for a specific staff member
  async getByStaff(
    staffId: string,
    startDate: string,
    endDate: string
  ): Promise<Shift[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('staff_id', staffId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    return data as Shift[];
  },

  // Create a new shift
  async create(shift: ShiftInsert): Promise<Shift> {
    const supabase = getSupabaseClient();

    const { data, error } = await (supabase
      .from('shifts') as ReturnType<typeof supabase.from>)
      .insert({
        ...shift,
        break_minutes: shift.break_minutes ?? 60,
        status: shift.status ?? 'scheduled',
      } as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return data as Shift;
  },

  // Create multiple shifts (bulk)
  async createBulk(shifts: ShiftInsert[]): Promise<Shift[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await (supabase
      .from('shifts') as ReturnType<typeof supabase.from>)
      .insert(
        shifts.map(s => ({
          ...s,
          break_minutes: s.break_minutes ?? 60,
          status: s.status ?? 'scheduled',
        })) as Record<string, unknown>[]
      )
      .select();

    if (error) throw error;
    return data as Shift[];
  },

  // Update a shift
  async update(shiftId: string, updates: ShiftUpdate): Promise<Shift> {
    const supabase = getSupabaseClient();

    const { data, error } = await (supabase
      .from('shifts') as ReturnType<typeof supabase.from>)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('id', shiftId)
      .select()
      .single();

    if (error) throw error;
    return data as Shift;
  },

  // Delete a shift
  async delete(shiftId: string): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', shiftId);

    if (error) throw error;
  },

  // Copy shifts from one week to another
  async copyWeek(
    storeId: string,
    sourceStartDate: string,
    targetStartDate: string
  ): Promise<Shift[]> {
    const supabase = getSupabaseClient();

    // Get source week shifts
    const sourceEnd = new Date(sourceStartDate);
    sourceEnd.setDate(sourceEnd.getDate() + 6);

    const { data: sourceShifts, error: fetchError } = await supabase
      .from('shifts')
      .select('*')
      .eq('store_id', storeId)
      .gte('date', sourceStartDate)
      .lte('date', sourceEnd.toISOString().split('T')[0]);

    if (fetchError) throw fetchError;

    if (!sourceShifts || sourceShifts.length === 0) {
      return [];
    }

    const typedSourceShifts = sourceShifts as Shift[];

    // Calculate day offset
    const sourceDateObj = new Date(sourceStartDate);
    const targetDateObj = new Date(targetStartDate);
    const dayOffset = Math.floor(
      (targetDateObj.getTime() - sourceDateObj.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Create new shifts with adjusted dates
    const newShifts: ShiftInsert[] = typedSourceShifts.map(shift => {
      const shiftDate = new Date(shift.date);
      shiftDate.setDate(shiftDate.getDate() + dayOffset);

      return {
        company_id: shift.company_id,
        store_id: shift.store_id,
        staff_id: shift.staff_id,
        date: shiftDate.toISOString().split('T')[0],
        start_time: shift.start_time,
        end_time: shift.end_time,
        break_minutes: shift.break_minutes,
        status: 'scheduled' as const,
      };
    });

    return this.createBulk(newShifts);
  },
};

// Attendance Service
export const attendanceService = {
  // Get today's attendance for a store
  async getTodayByStore(storeId: string): Promise<Attendance[]> {
    const supabase = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendances')
      .select(`
        *,
        staff:staff_id (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('store_id', storeId)
      .eq('date', today)
      .order('clock_in', { ascending: true });

    if (error) throw error;
    return data as Attendance[];
  },

  // Get attendance for a date range
  async getByDateRange(
    storeId: string,
    startDate: string,
    endDate: string
  ): Promise<Attendance[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('attendances')
      .select(`
        *,
        staff:staff_id (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('store_id', storeId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    return data as Attendance[];
  },

  // Get staff member's attendance
  async getByStaff(
    staffId: string,
    startDate: string,
    endDate: string
  ): Promise<Attendance[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('staff_id', staffId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    return data as Attendance[];
  },

  // Clock in
  async clockIn(attendance: AttendanceInsert): Promise<Attendance> {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await (supabase
      .from('attendances') as ReturnType<typeof supabase.from>)
      .insert({
        ...attendance,
        clock_in: attendance.clock_in || now,
        status: 'clocked_in',
      } as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return data as Attendance;
  },

  // Clock out
  async clockOut(attendanceId: string): Promise<Attendance> {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    // First get the current attendance record
    const { data: current, error: fetchError } = await supabase
      .from('attendances')
      .select('*')
      .eq('id', attendanceId)
      .single();

    if (fetchError) throw fetchError;
    const currentAttendance = current as Attendance;

    // Calculate total work minutes
    const clockIn = new Date(currentAttendance.clock_in!);
    const clockOut = new Date(now);
    const totalMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / (1000 * 60));
    const totalWorkMinutes = totalMinutes - (currentAttendance.total_break_minutes || 0);

    const { data, error } = await (supabase
      .from('attendances') as ReturnType<typeof supabase.from>)
      .update({
        clock_out: now,
        total_work_minutes: totalWorkMinutes,
        status: 'clocked_out',
        updated_at: now,
      } as Record<string, unknown>)
      .eq('id', attendanceId)
      .select()
      .single();

    if (error) throw error;
    return data as Attendance;
  },

  // Start break
  async startBreak(attendanceId: string): Promise<Attendance> {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await (supabase
      .from('attendances') as ReturnType<typeof supabase.from>)
      .update({
        break_start: now,
        status: 'on_break',
        updated_at: now,
      } as Record<string, unknown>)
      .eq('id', attendanceId)
      .select()
      .single();

    if (error) throw error;
    return data as Attendance;
  },

  // End break
  async endBreak(attendanceId: string): Promise<Attendance> {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    // First get the current attendance record
    const { data: current, error: fetchError } = await supabase
      .from('attendances')
      .select('*')
      .eq('id', attendanceId)
      .single();

    if (fetchError) throw fetchError;
    const currentAttendance = current as Attendance;

    // Calculate break duration
    const breakStart = new Date(currentAttendance.break_start!);
    const breakEnd = new Date(now);
    const breakMinutes = Math.floor((breakEnd.getTime() - breakStart.getTime()) / (1000 * 60));
    const totalBreakMinutes = (currentAttendance.total_break_minutes || 0) + breakMinutes;

    const { data, error } = await (supabase
      .from('attendances') as ReturnType<typeof supabase.from>)
      .update({
        break_start: null,
        break_end: now,
        total_break_minutes: totalBreakMinutes,
        status: 'clocked_in',
        updated_at: now,
      } as Record<string, unknown>)
      .eq('id', attendanceId)
      .select()
      .single();

    if (error) throw error;
    return data as Attendance;
  },

  // Update attendance
  async update(attendanceId: string, updates: AttendanceUpdate): Promise<Attendance> {
    const supabase = getSupabaseClient();

    const { data, error } = await (supabase
      .from('attendances') as ReturnType<typeof supabase.from>)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('id', attendanceId)
      .select()
      .single();

    if (error) throw error;
    return data as Attendance;
  },

  // Get monthly summary for staff
  async getMonthlySummary(
    staffId: string,
    year: number,
    month: number
  ): Promise<{
    totalWorkDays: number;
    totalWorkMinutes: number;
    totalBreakMinutes: number;
    averageWorkMinutes: number;
  }> {
    const supabase = getSupabaseClient();

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendances')
      .select('total_work_minutes, total_break_minutes')
      .eq('staff_id', staffId)
      .eq('status', 'clocked_out')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;

    const attendanceData = (data || []) as Array<{ total_work_minutes: number | null; total_break_minutes: number | null }>;
    const totalWorkDays = attendanceData.length;
    const totalWorkMinutes = attendanceData.reduce((sum, a) => sum + (a.total_work_minutes || 0), 0);
    const totalBreakMinutes = attendanceData.reduce((sum, a) => sum + (a.total_break_minutes || 0), 0);

    return {
      totalWorkDays,
      totalWorkMinutes,
      totalBreakMinutes,
      averageWorkMinutes: totalWorkDays > 0 ? Math.round(totalWorkMinutes / totalWorkDays) : 0,
    };
  },
};
