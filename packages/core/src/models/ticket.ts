export type TicketStatus = 'active' | 'used' | 'expired';

export interface TicketType {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  price: number;
  totalCount: number;
  validDays?: number;
  applicableMenuTagIds: string[];
  applicableMenuIds: string[];
  isGift: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  companyId: string;
  ticketTypeId: string;
  customerId: string;
  code: string;
  remainingCount: number;
  purchasedAt: string;
  expiresAt?: string;
  status: TicketStatus;
  saleId?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  ticketType?: TicketType;
}

export interface TicketUsage {
  id: string;
  ticketId: string;
  saleId: string;
  saleItemId: string;
  countUsed: number;
  usedAt: string;
  createdAt: string;
}

export interface CreateTicketTypeInput {
  companyId: string;
  name: string;
  description?: string;
  price: number;
  totalCount: number;
  validDays?: number;
  applicableMenuTagIds?: string[];
  applicableMenuIds?: string[];
  isGift?: boolean;
}

export interface UpdateTicketTypeInput extends Partial<Omit<CreateTicketTypeInput, 'companyId'>> {
  isActive?: boolean;
}

export interface PurchaseTicketInput {
  ticketTypeId: string;
  customerId: string;
  saleId?: string;
}

export interface UseTicketInput {
  ticketId: string;
  saleId: string;
  saleItemId: string;
  countUsed?: number;
}

export function isTicketApplicable(ticket: Ticket, ticketType: TicketType, menuId: string, menuTagIds: string[]): boolean {
  if (ticket.status !== 'active') return false;
  if (ticket.remainingCount <= 0) return false;
  if (ticket.expiresAt && new Date(ticket.expiresAt) < new Date()) return false;

  // Check if menu is applicable
  if (ticketType.applicableMenuIds.length > 0) {
    if (ticketType.applicableMenuIds.includes(menuId)) return true;
  }

  if (ticketType.applicableMenuTagIds.length > 0) {
    if (ticketType.applicableMenuTagIds.some(tagId => menuTagIds.includes(tagId))) return true;
  }

  // If no restrictions, applicable to all
  return ticketType.applicableMenuIds.length === 0 && ticketType.applicableMenuTagIds.length === 0;
}
