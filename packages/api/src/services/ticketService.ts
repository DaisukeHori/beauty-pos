import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables } from '../types/database';

export type Ticket = Tables<'tickets'>;
export type TicketInsert = InsertTables<'tickets'>;
export type TicketUpdate = UpdateTables<'tickets'>;
export type TicketUsage = Tables<'ticket_usages'>;

export interface TicketWithDetails extends Ticket {
  customer?: Tables<'customers'> | null;
  usages?: TicketUsage[];
}

export const ticketService = {
  async getById(id: string): Promise<TicketWithDetails | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*),
        usages:ticket_usages(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as TicketWithDetails;
  },

  async getByCustomer(customerId: string, activeOnly: boolean = true): Promise<Ticket[]> {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('tickets')
      .select('*')
      .eq('customer_id', customerId);

    if (activeOnly) {
      query = query.eq('status', 'active');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getActive(companyId: string): Promise<Ticket[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(ticket: TicketInsert): Promise<Ticket> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tickets')
      .insert(ticket)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: TicketUpdate): Promise<Ticket> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async use(
    ticketId: string,
    saleId: string,
    saleItemId?: string,
    amount?: number,
    usesCount: number = 1
  ): Promise<TicketUsage> {
    const supabase = getSupabaseClient();

    // Get current ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError) throw ticketError;
    if (!ticket) throw new Error('Ticket not found');

    // Validate ticket can be used
    if (ticket.status !== 'active') {
      throw new Error('Ticket is not active');
    }

    if (ticket.valid_until && new Date(ticket.valid_until) < new Date()) {
      throw new Error('Ticket has expired');
    }

    // For count-based tickets
    if (ticket.ticket_type === 'count' && ticket.remaining_uses < usesCount) {
      throw new Error('Not enough remaining uses');
    }

    // For amount-based tickets
    if (ticket.ticket_type === 'amount' && ticket.remaining_amount !== null && amount) {
      if (ticket.remaining_amount < amount) {
        throw new Error('Not enough remaining balance');
      }
    }

    // Create usage record
    const { data: usage, error: usageError } = await supabase
      .from('ticket_usages')
      .insert({
        ticket_id: ticketId,
        sale_id: saleId,
        sale_item_id: saleItemId,
        amount_used: amount,
        uses_count: usesCount,
        used_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (usageError) throw usageError;

    // Update ticket
    const updateData: TicketUpdate = {};

    if (ticket.ticket_type === 'count') {
      updateData.remaining_uses = ticket.remaining_uses - usesCount;
      if (updateData.remaining_uses <= 0) {
        updateData.status = 'used';
      }
    } else if (ticket.ticket_type === 'amount' && amount) {
      updateData.remaining_amount = (ticket.remaining_amount || 0) - amount;
      if (updateData.remaining_amount <= 0) {
        updateData.status = 'used';
      }
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId);
    }

    return usage;
  },

  async cancel(id: string): Promise<Ticket> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tickets')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async expire(id: string): Promise<Ticket> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tickets')
      .update({ status: 'expired' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getExpiring(companyId: string, withinDays: number = 30): Promise<Ticket[]> {
    const supabase = getSupabaseClient();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);

    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .not('valid_until', 'is', null)
      .lte('valid_until', futureDate.toISOString())
      .order('valid_until', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async isApplicable(ticketId: string, menuId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { data: ticket } = await supabase
      .from('tickets')
      .select('applicable_menu_ids')
      .eq('id', ticketId)
      .single();

    if (!ticket) return false;

    const applicableMenuIds = ticket.applicable_menu_ids as string[] | null;

    // If no restrictions, ticket is applicable to all menus
    if (!applicableMenuIds || applicableMenuIds.length === 0) {
      return true;
    }

    return applicableMenuIds.includes(menuId);
  },

  async getUsageHistory(ticketId: string): Promise<TicketUsage[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('ticket_usages')
      .select(`
        *,
        sale:sales(*)
      `)
      .eq('ticket_id', ticketId)
      .order('used_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
