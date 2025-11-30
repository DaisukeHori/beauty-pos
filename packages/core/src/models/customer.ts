export type CustomerStatus = 'active' | 'dormant' | 'lost';
export type CustomerRank = 'bronze' | 'silver' | 'gold' | 'platinum';
export type Gender = 'male' | 'female' | 'other';

export interface Customer {
  id: string;
  companyId: string;
  customerCode?: string;
  firstName: string;
  lastName: string;
  firstNameKana?: string;
  lastNameKana?: string;
  gender?: Gender;
  birthDate?: string;
  phone?: string;
  email?: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  street?: string;
  building?: string;
  referralSource?: string;
  referralCustomerId?: string;
  status: CustomerStatus;
  rank?: CustomerRank;
  totalVisits: number;
  totalSpent: number;
  averageSpent: number;
  points: number;
  lastVisitAt?: string;
  nextVisitEstimate?: string;
  visitIntervalDays?: number;
  notes?: string;
  // Consent
  consentPrivacyPolicy: boolean;
  consentPrivacyPolicyAt?: string;
  consentMarketing: boolean;
  consentMarketingAt?: string;
  consentPhotoSns: boolean;
  consentPhotoHp: boolean;
  consentPhotoAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  karte?: CustomerKarte;
  tags?: import('./tag').Tag[];
}

export interface CustomerKarte {
  id: string;
  customerId: string;
  // Hair
  hairThickness?: 'thin' | 'normal' | 'thick';
  hairHardness?: 'soft' | 'normal' | 'hard';
  hairVolume?: 'little' | 'normal' | 'much';
  hairCurlType?: 'straight' | 'wavy' | 'curly' | 'kinky';
  hairCurlLevel?: number;
  hairDamageLevel?: number;
  hairDamageNotes?: string;
  // Gray hair
  grayHairPercentage?: number;
  grayHairDistribution?: string;
  grayHairGrowthRate?: number;
  recommendedVisitInterval?: number;
  // Scalp
  scalpType?: 'normal' | 'dry' | 'oily';
  scalpSensitivity: boolean;
  scalpNotes?: string;
  // Allergies
  allergies: Allergy[];
  patchTestRequired: boolean;
  lastPatchTestDate?: string;
  lastPatchTestResult?: 'ok' | 'ng';
  // Health
  isPregnant: boolean;
  healthNotes?: string;
  wheelchairRequired: boolean;
  // Preferences
  occupation?: string;
  lifestyleNotes?: string;
  preferredStyles: string[];
  ngStyles: string[];
  conversationTopics?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Allergy {
  type: string;
  details?: string;
  severity?: 'mild' | 'moderate' | 'severe';
}

export interface CustomerPhoto {
  id: string;
  customerId: string;
  visitId?: string;
  type: 'before' | 'after' | 'style_reference';
  angle?: 'front' | 'left' | 'right' | 'back';
  url: string;
  thumbnailUrl?: string;
  notes?: string;
  isFavorite: boolean;
  takenAt: string;
  createdAt: string;
}

export interface ColorRecipe {
  id: string;
  customerId: string;
  visitId?: string;
  staffId?: string;
  area: 'root' | 'mid' | 'end' | 'highlight' | 'lowlight' | 'all';
  brand?: string;
  colorName?: string;
  colorNumber?: string;
  amountG?: number;
  developerPercent?: number;
  developerAmountG?: number;
  additives?: { name: string; amount: string }[];
  processingTime?: number;
  heatApplied: boolean;
  resultNotes?: string;
  resultRating?: number;
  createdAt: string;
}

export interface PermRecipe {
  id: string;
  customerId: string;
  visitId?: string;
  staffId?: string;
  permType?: 'cold' | 'digital' | 'air' | 'creep' | 'straight';
  rodSizes?: { area: string; size: string; count: number }[];
  windingPattern?: string;
  solution1Brand?: string;
  solution1Type?: string;
  solution1Time?: number;
  solution2Brand?: string;
  solution2Type?: string;
  solution2Time?: number;
  heatTemp?: number;
  heatTime?: number;
  resultNotes?: string;
  resultRating?: number;
  createdAt: string;
}

export interface CreateCustomerInput {
  companyId: string;
  firstName: string;
  lastName: string;
  firstNameKana?: string;
  lastNameKana?: string;
  gender?: Gender;
  birthDate?: string;
  phone?: string;
  email?: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  street?: string;
  building?: string;
  referralSource?: string;
  referralCustomerId?: string;
  notes?: string;
  consentPrivacyPolicy: boolean;
  consentMarketing?: boolean;
}

export interface UpdateCustomerInput extends Partial<Omit<CreateCustomerInput, 'companyId'>> {
  status?: CustomerStatus;
  rank?: CustomerRank;
  consentPhotoSns?: boolean;
  consentPhotoHp?: boolean;
}

export interface CustomerSummary {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: CustomerStatus;
  rank?: CustomerRank;
  totalVisits: number;
  lastVisitAt?: string;
}
