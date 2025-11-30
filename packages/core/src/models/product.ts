export interface Product {
  id: string;
  companyId: string;
  code?: string;
  name: string;
  brand?: string;
  description?: string;
  price: number;
  cost?: number;
  taxRate: number;
  stockQuantity: number;
  reorderPoint?: number;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined data
  tags?: import('./tag').Tag[];
}

export interface Material {
  id: string;
  companyId: string;
  code?: string;
  name: string;
  brand?: string;
  category?: 'color' | 'perm' | 'treatment' | 'shampoo' | 'other';
  unit?: string;
  costPerUnit?: number;
  stockQuantity: number;
  reorderPoint?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  companyId: string;
  code?: string;
  name: string;
  brand?: string;
  description?: string;
  price: number;
  cost?: number;
  taxRate?: number;
  stockQuantity?: number;
  reorderPoint?: number;
  imageUrl?: string;
  sortOrder?: number;
}

export interface UpdateProductInput extends Partial<Omit<CreateProductInput, 'companyId'>> {
  isActive?: boolean;
}

export interface CreateMaterialInput {
  companyId: string;
  code?: string;
  name: string;
  brand?: string;
  category?: Material['category'];
  unit?: string;
  costPerUnit?: number;
  stockQuantity?: number;
  reorderPoint?: number;
}

export interface UpdateMaterialInput extends Partial<Omit<CreateMaterialInput, 'companyId'>> {
  isActive?: boolean;
}
