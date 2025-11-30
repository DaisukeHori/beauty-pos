import { create } from 'zustand';
import type {
  Sale,
  CartItem,
  CartPayment,
  CartItemDiscount,
  SaleTotals,
  calculateCartTotals,
  NominationType,
} from '../models';

interface CurrentSaleContext {
  visitId?: string;
  customerId: string;
  customerName: string;
  primaryStaffId: string;
  primaryStaffName: string;
  nominationType: NominationType;
  nominationFee: number;
}

interface SaleState {
  // Current sale being created
  currentContext: CurrentSaleContext | null;
  cart: CartItem[];
  payments: CartPayment[];
  globalDiscounts: CartItemDiscount[];
  pointsUsed: number;
  // Completed sales
  sales: Sale[];
  selectedSale: Sale | null;
  // UI state
  isProcessing: boolean;
  isLoading: boolean;
  error: string | null;
}

interface SaleActions {
  // Sale context
  startSale: (context: CurrentSaleContext) => void;
  cancelSale: () => void;
  // Cart management
  addToCart: (item: CartItem) => void;
  updateCartItem: (id: string, updates: Partial<CartItem>) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  // Payments
  addPayment: (payment: CartPayment) => void;
  removePayment: (index: number) => void;
  clearPayments: () => void;
  // Discounts
  addGlobalDiscount: (discount: CartItemDiscount) => void;
  removeGlobalDiscount: (index: number) => void;
  // Points
  setPointsUsed: (points: number) => void;
  // Calculations
  getCartTotals: (pointRate?: number) => SaleTotals;
  // Sales history
  setSales: (sales: Sale[]) => void;
  setSelectedSale: (sale: Sale | null) => void;
  addSale: (sale: Sale) => void;
  // State
  setProcessing: (isProcessing: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: SaleState = {
  currentContext: null,
  cart: [],
  payments: [],
  globalDiscounts: [],
  pointsUsed: 0,
  sales: [],
  selectedSale: null,
  isProcessing: false,
  isLoading: false,
  error: null,
};

export const useSaleStore = create<SaleState & SaleActions>((set, get) => ({
  ...initialState,

  startSale: (context) =>
    set({
      currentContext: context,
      cart: [],
      payments: [],
      globalDiscounts: [],
      pointsUsed: 0,
      error: null,
    }),

  cancelSale: () =>
    set({
      currentContext: null,
      cart: [],
      payments: [],
      globalDiscounts: [],
      pointsUsed: 0,
    }),

  addToCart: (item) =>
    set((state) => ({
      cart: [...state.cart, item],
    })),

  updateCartItem: (id, updates) =>
    set((state) => ({
      cart: state.cart.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),

  removeFromCart: (id) =>
    set((state) => ({
      cart: state.cart.filter((item) => item.id !== id),
    })),

  clearCart: () =>
    set({ cart: [] }),

  addPayment: (payment) =>
    set((state) => ({
      payments: [...state.payments, payment],
    })),

  removePayment: (index) =>
    set((state) => ({
      payments: state.payments.filter((_, i) => i !== index),
    })),

  clearPayments: () =>
    set({ payments: [] }),

  addGlobalDiscount: (discount) =>
    set((state) => ({
      globalDiscounts: [...state.globalDiscounts, discount],
    })),

  removeGlobalDiscount: (index) =>
    set((state) => ({
      globalDiscounts: state.globalDiscounts.filter((_, i) => i !== index),
    })),

  setPointsUsed: (pointsUsed) =>
    set({ pointsUsed }),

  getCartTotals: (pointRate = 0.01) => {
    const { cart, globalDiscounts, pointsUsed } = get();
    return calculateCartTotalsLocal(cart, globalDiscounts, pointsUsed, pointRate);
  },

  setSales: (sales) =>
    set({ sales }),

  setSelectedSale: (selectedSale) =>
    set({ selectedSale }),

  addSale: (sale) =>
    set((state) => ({
      sales: [sale, ...state.sales],
    })),

  setProcessing: (isProcessing) =>
    set({ isProcessing }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error, isProcessing: false }),

  reset: () =>
    set(initialState),
}));

// Local implementation of calculateCartTotals
function calculateCartTotalsLocal(
  items: CartItem[],
  globalDiscounts: CartItemDiscount[] = [],
  pointsUsed: number = 0,
  pointRate: number = 0.01
): SaleTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  items.forEach(item => {
    const itemSubtotal = (item.unitPrice + (item.hairLengthCharge || 0)) * item.quantity;
    subtotal += itemSubtotal;

    item.discounts.forEach(discount => {
      if (discount.type === 'percentage') {
        discountTotal += Math.floor(itemSubtotal * discount.value / 100);
      } else {
        discountTotal += discount.value;
      }
    });

    const taxableAmount = itemSubtotal - item.discounts.reduce((sum, d) => {
      if (d.type === 'percentage') {
        return sum + Math.floor(itemSubtotal * d.value / 100);
      }
      return sum + d.value;
    }, 0);
    taxTotal += Math.floor(taxableAmount * item.taxRate / 100);
  });

  globalDiscounts.forEach(discount => {
    if (discount.type === 'percentage') {
      discountTotal += Math.floor(subtotal * discount.value / 100);
    } else {
      discountTotal += discount.value;
    }
  });

  const total = subtotal - discountTotal + taxTotal - pointsUsed;
  const pointsEarned = Math.floor(Math.max(0, total) * pointRate);

  return {
    subtotal,
    discountTotal,
    taxTotal,
    total: Math.max(0, total),
    pointsEarned,
  };
}
