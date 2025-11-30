export interface Company {
  id: string;
  name: string;
  nameKana?: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  invoiceRegistrationNumber?: string;
  plan: 'basic' | 'professional' | 'enterprise';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus: 'active' | 'past_due' | 'cancelled';
  settings: CompanySettings;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  taxRate?: number;
  pointRate?: number;
  reservationInterval?: number;
  defaultNominationFee?: number;
  receiptHeader?: string;
  receiptFooter?: string;
}

export interface CreateCompanyInput {
  name: string;
  nameKana?: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  plan?: 'basic' | 'professional' | 'enterprise';
}

export interface UpdateCompanyInput extends Partial<CreateCompanyInput> {
  invoiceRegistrationNumber?: string;
  settings?: CompanySettings;
}
