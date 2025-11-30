import type { CustomerSummary } from './customer';
import type { StaffSummary } from './staff';
import type { Menu, HairLength } from './menu';

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type NominationType = 'nominated' | 'free';

export type ReservationSource = 'app' | 'phone' | 'walk_in' | 'hotpepper' | 'other';

export interface Reservation {
  id: string;
  companyId: string;
  storeId: string;
  customerId: string;
  staffId: string;
  nominationType: NominationType;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  estimatedTotal?: number;
  status: ReservationStatus;
  source: ReservationSource;
  notes?: string;
  internalNotes?: string;
  reminderSent: boolean;
  reminderSentAt?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  customer?: CustomerSummary;
  staff?: StaffSummary;
  menus?: ReservationMenu[];
}

export interface ReservationMenu {
  id: string;
  reservationId: string;
  menuId: string;
  quantity: number;
  hairLength?: HairLength;
  createdAt: string;
  // Joined data
  menu?: Menu;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  staffId: string;
  staffName: string;
  available: boolean;
}

export interface CreateReservationInput {
  companyId: string;
  storeId: string;
  customerId: string;
  staffId: string;
  nominationType: NominationType;
  startTime: string;
  menus: { menuId: string; quantity?: number; hairLength?: HairLength }[];
  source?: ReservationSource;
  notes?: string;
  internalNotes?: string;
}

export interface UpdateReservationInput {
  staffId?: string;
  nominationType?: NominationType;
  startTime?: string;
  menus?: { menuId: string; quantity?: number; hairLength?: HairLength }[];
  status?: ReservationStatus;
  notes?: string;
  internalNotes?: string;
  cancelReason?: string;
}

export interface ReservationFilter {
  storeId?: string;
  staffId?: string;
  customerId?: string;
  status?: ReservationStatus | ReservationStatus[];
  dateFrom?: string;
  dateTo?: string;
}

export function calculateReservationDuration(menus: { durationMinutes: number }[]): number {
  return menus.reduce((sum, menu) => sum + menu.durationMinutes, 0);
}

export function calculateReservationEndTime(startTime: Date, durationMinutes: number): Date {
  return new Date(startTime.getTime() + durationMinutes * 60 * 1000);
}
