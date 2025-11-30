import type { CustomerSummary } from './customer';
import type { StaffSummary } from './staff';
import type { HairLength } from './menu';
import type { NominationType } from './reservation';

export type SaleStatus = 'completed' | 'refunded' | 'partially_refunded';
export type SaleItemType = 'menu' | 'product';
export type StaffAssignmentRole = 'primary' | 'worker1' | 'worker2';
export type PaymentMethod =
  | 'cash'
  | 'credit_card'
  | 'debit_card'
  | 'electronic_money'
  | 'qr_code'
  | 'gift_card'
  | 'prepaid'
  | 'accounts_receivable'
  | 'points';

export type DiscountType = 'percentage' | 'amount' | 'coupon';

export interface Sale {
  id: string;
  companyId: string;
  storeId: string;
  visitId?: string;
  customerId: string;
  primaryStaffId: string;
  nominationType: NominationType;
  nominationFee: number;
  receiptNumber: string;
  invoiceNumber?: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  pointsUsed: number;
  pointsEarned: number;
  status: SaleStatus;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  customer?: CustomerSummary;
  primaryStaff?: StaffSummary;
  items?: SaleItem[];
  payments?: SalePayment[];
  discounts?: SaleDiscount[];
}

export interface SaleItem {
  id: string;
  saleId: string;
  type: SaleItemType;
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  hairLength?: HairLength;
  hairLengthCharge: number;
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  // Joined data
  staffAssignments?: SaleItemStaffAssignment[];
  processAssignments?: SaleItemProcessAssignment[];
}

export interface SaleItemStaffAssignment {
  id: string;
  saleItemId: string;
  staffId: string;
  role: StaffAssignmentRole;
  salesAmount: number;
  productivityAmount: number;
  createdAt: string;
  // Joined data
  staff?: StaffSummary;
}

export interface SaleItemProcessAssignment {
  id: string;
  saleItemId: string;
  processId: string;
  staffId: string;
  productivityAmount: number;
  createdAt: string;
  // Joined data
  staff?: StaffSummary;
  process?: { id: string; name: string };
}

export interface SalePayment {
  id: string;
  saleId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  cardBrand?: string;
  terminalTransactionId?: string;
  createdAt: string;
}

export interface SaleDiscount {
  id: string;
  saleId: string;
  saleItemId?: string;
  type: DiscountType;
  value: number;
  amount: number;
  couponId?: string;
  reason?: string;
  createdAt: string;
}

// Input types for creating sales
export interface CartItem {
  id: string;
  type: SaleItemType;
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  hairLength?: HairLength;
  hairLengthCharge?: number;
  taxRate: number;
  staffAssignments: CartItemStaffAssignment[];
  processAssignments: CartItemProcessAssignment[];
  discounts: CartItemDiscount[];
}

export interface CartItemStaffAssignment {
  staffId: string;
  role: StaffAssignmentRole;
  rate: number; // 0-100 percentage
}

export interface CartItemProcessAssignment {
  processId: string;
  staffId: string;
  productivityAmount: number;
}

export interface CartItemDiscount {
  type: DiscountType;
  value: number;
  couponId?: string;
  reason?: string;
}

export interface CartPayment {
  paymentMethod: PaymentMethod;
  amount: number;
  cardBrand?: string;
}

export interface CheckoutInput {
  companyId: string;
  storeId: string;
  visitId?: string;
  customerId: string;
  primaryStaffId: string;
  nominationType: NominationType;
  nominationFee?: number;
  items: CartItem[];
  payments: CartPayment[];
  globalDiscounts?: CartItemDiscount[];
  ticketUsages?: { ticketId: string; saleItemIndex: number }[];
  pointsUsed?: number;
  notes?: string;
}

export interface SaleTotals {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  pointsEarned: number;
}

export function calculateCartTotals(items: CartItem[], globalDiscounts: CartItemDiscount[] = [], pointsUsed: number = 0, pointRate: number = 0.01): SaleTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  items.forEach(item => {
    const itemSubtotal = (item.unitPrice + (item.hairLengthCharge || 0)) * item.quantity;
    subtotal += itemSubtotal;

    // Item-level discounts
    item.discounts.forEach(discount => {
      if (discount.type === 'percentage') {
        discountTotal += Math.floor(itemSubtotal * discount.value / 100);
      } else {
        discountTotal += discount.value;
      }
    });

    // Tax
    const taxableAmount = itemSubtotal - item.discounts.reduce((sum, d) => {
      if (d.type === 'percentage') {
        return sum + Math.floor(itemSubtotal * d.value / 100);
      }
      return sum + d.value;
    }, 0);
    taxTotal += Math.floor(taxableAmount * item.taxRate / 100);
  });

  // Global discounts
  globalDiscounts.forEach(discount => {
    if (discount.type === 'percentage') {
      discountTotal += Math.floor(subtotal * discount.value / 100);
    } else {
      discountTotal += discount.value;
    }
  });

  const total = subtotal - discountTotal + taxTotal - pointsUsed;
  const pointsEarned = Math.floor(total * pointRate);

  return {
    subtotal,
    discountTotal,
    taxTotal,
    total: Math.max(0, total),
    pointsEarned,
  };
}
