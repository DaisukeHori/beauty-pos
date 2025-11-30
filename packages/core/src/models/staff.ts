export type StaffRole = 'owner' | 'manager' | 'stylist' | 'assistant';
export type StaffRank = 'jr' | 'stylist' | 'top_stylist' | 'director';

export interface Staff {
  id: string;
  companyId: string;
  userId?: string;
  employeeCode?: string;
  firstName: string;
  lastName: string;
  firstNameKana?: string;
  lastNameKana?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  role: StaffRole;
  rank?: StaffRank;
  nominationFee: number;
  commissionRate?: number;
  licenseNumber?: string;
  licenseExpiry?: string;
  hireDate?: string;
  birthDate?: string;
  bio?: string;
  specialties: string[];
  snsLinks: SnsLinks;
  settings: StaffSettings;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined data
  stores?: StaffStore[];
}

export interface SnsLinks {
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
}

export interface StaffSettings {
  notificationEnabled?: boolean;
  theme?: 'light' | 'dark' | 'system';
}

export interface StaffStore {
  id: string;
  staffId: string;
  storeId: string;
  isPrimary: boolean;
  store?: {
    id: string;
    name: string;
  };
}

export interface CreateStaffInput {
  companyId: string;
  firstName: string;
  lastName: string;
  firstNameKana?: string;
  lastNameKana?: string;
  email?: string;
  phone?: string;
  role?: StaffRole;
  rank?: StaffRank;
  nominationFee?: number;
  commissionRate?: number;
  storeIds?: string[];
  primaryStoreId?: string;
}

export interface UpdateStaffInput extends Partial<Omit<CreateStaffInput, 'companyId'>> {
  avatarUrl?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  hireDate?: string;
  birthDate?: string;
  bio?: string;
  specialties?: string[];
  snsLinks?: SnsLinks;
  settings?: StaffSettings;
  isActive?: boolean;
}

export interface StaffSummary {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: StaffRole;
  rank?: StaffRank;
}
