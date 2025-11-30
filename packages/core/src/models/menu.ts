export type HairLength = 'short' | 'medium' | 'long';

export interface MenuCategory {
  id: string;
  companyId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined data
  menus?: Menu[];
}

export interface Menu {
  id: string;
  companyId: string;
  categoryId?: string;
  code?: string;
  name: string;
  description?: string;
  basePrice: number;
  priceShort?: number;
  priceMedium?: number;
  priceLong?: number;
  longCharge: number;
  durationMinutes: number;
  productivityRatePrimary: number;
  productivityRateWorker1: number;
  productivityRateWorker2: number;
  taxRate: number;
  isSetMenu: boolean;
  setMenuItems?: SetMenuItem[];
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined data
  category?: MenuCategory;
  processes?: MenuProcess[];
  tags?: import('./tag').Tag[];
}

export interface SetMenuItem {
  menuId: string;
  discount?: number;
}

export interface Process {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  defaultProductivityRate: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuProcess {
  id: string;
  menuId: string;
  processId: string;
  productivityAmount: number;
  defaultWorker1Rate: number;
  defaultWorker2Rate: number;
  sortOrder: number;
  createdAt: string;
  // Joined data
  process?: Process;
}

export interface CreateMenuCategoryInput {
  companyId: string;
  name: string;
  sortOrder?: number;
}

export interface UpdateMenuCategoryInput {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateMenuInput {
  companyId: string;
  categoryId?: string;
  code?: string;
  name: string;
  description?: string;
  basePrice: number;
  priceShort?: number;
  priceMedium?: number;
  priceLong?: number;
  longCharge?: number;
  durationMinutes: number;
  taxRate?: number;
  isSetMenu?: boolean;
  setMenuItems?: SetMenuItem[];
  sortOrder?: number;
}

export interface UpdateMenuInput extends Partial<Omit<CreateMenuInput, 'companyId'>> {
  productivityRatePrimary?: number;
  productivityRateWorker1?: number;
  productivityRateWorker2?: number;
  isActive?: boolean;
}

export interface CreateProcessInput {
  companyId: string;
  name: string;
  description?: string;
  defaultProductivityRate?: number;
  sortOrder?: number;
}

export interface UpdateProcessInput extends Partial<Omit<CreateProcessInput, 'companyId'>> {
  isActive?: boolean;
}

export function getMenuPrice(menu: Menu, hairLength?: HairLength): number {
  if (!hairLength) return menu.basePrice;

  switch (hairLength) {
    case 'short':
      return menu.priceShort ?? menu.basePrice;
    case 'medium':
      return menu.priceMedium ?? menu.basePrice;
    case 'long':
      return (menu.priceLong ?? menu.basePrice) + menu.longCharge;
    default:
      return menu.basePrice;
  }
}
