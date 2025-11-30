export interface Store {
  id: string;
  companyId: string;
  name: string;
  nameKana?: string;
  code?: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  businessHours: BusinessHours;
  holidays: Holidays;
  seatCount: number;
  reservationInterval: number;
  settings: StoreSettings;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessHours {
  [key: string]: { open: string; close: string } | null;
  // mon, tue, wed, thu, fri, sat, sun
}

export interface Holidays {
  regular: string[]; // e.g., ['sunday']
  special: string[]; // e.g., ['2025-01-01']
}

export interface StoreSettings {
  defaultStaffId?: string;
  autoReminder?: boolean;
  reminderHoursBefore?: number;
}

export interface CreateStoreInput {
  companyId: string;
  name: string;
  nameKana?: string;
  code?: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  businessHours?: BusinessHours;
  seatCount?: number;
  reservationInterval?: number;
}

export interface UpdateStoreInput extends Partial<Omit<CreateStoreInput, 'companyId'>> {
  holidays?: Holidays;
  settings?: StoreSettings;
  isActive?: boolean;
}
