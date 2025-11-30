import type { CustomerSummary } from './customer';
import type { StaffSummary } from './staff';
import type { NominationType } from './reservation';

export type VisitStatus = 'checked_in' | 'in_service' | 'completed';

export interface Visit {
  id: string;
  companyId: string;
  storeId: string;
  customerId: string;
  reservationId?: string;
  primaryStaffId: string;
  nominationType: NominationType;
  visitNumber?: number;
  checkInAt: string;
  checkOutAt?: string;
  waitTimeMinutes?: number;
  serviceStartAt?: string;
  serviceEndAt?: string;
  status: VisitStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  customer?: CustomerSummary;
  primaryStaff?: StaffSummary;
}

export interface CreateVisitInput {
  companyId: string;
  storeId: string;
  customerId: string;
  reservationId?: string;
  primaryStaffId: string;
  nominationType: NominationType;
  notes?: string;
}

export interface UpdateVisitInput {
  primaryStaffId?: string;
  nominationType?: NominationType;
  status?: VisitStatus;
  serviceStartAt?: string;
  serviceEndAt?: string;
  notes?: string;
}

export interface CheckInInput {
  reservationId?: string;
  customerId: string;
  storeId: string;
  primaryStaffId: string;
  nominationType: NominationType;
}

export interface CheckOutInput {
  visitId: string;
}
