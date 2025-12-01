import { useSaleStore } from '../saleStore';

// Reset store before each test
beforeEach(() => {
  useSaleStore.getState().reset();
});

describe('useSaleStore', () => {
  const mockContext = {
    visitId: 'visit-1',
    customerId: 'customer-1',
    customerName: '田中太郎',
    primaryStaffId: 'staff-1',
    primaryStaffName: '山田花子',
    nominationType: 'nominated' as const,
    nominationFee: 500,
  };

  const mockCartItem = {
    id: 'item-1',
    type: 'menu' as const,
    itemId: 'menu-1',
    name: 'カット',
    unitPrice: 5000,
    quantity: 1,
    taxRate: 10,
    staffAssignments: [],
    processAssignments: [],
    discounts: [],
  };

  const mockPayment = {
    paymentMethod: 'cash' as const,
    amount: 5500,
  };

  describe('initial state', () => {
    it('should initialize with empty cart', () => {
      expect(useSaleStore.getState().cart).toHaveLength(0);
    });

    it('should initialize with no current context', () => {
      expect(useSaleStore.getState().currentContext).toBeNull();
    });

    it('should initialize with empty payments', () => {
      expect(useSaleStore.getState().payments).toHaveLength(0);
    });

    it('should initialize with no points used', () => {
      expect(useSaleStore.getState().pointsUsed).toBe(0);
    });
  });

  describe('startSale', () => {
    it('should set sale context and clear cart', () => {
      // Add something to cart first
      useSaleStore.getState().addToCart(mockCartItem);
      expect(useSaleStore.getState().cart).toHaveLength(1);

      // Start new sale
      useSaleStore.getState().startSale(mockContext);

      const state = useSaleStore.getState();
      expect(state.currentContext).toEqual(mockContext);
      expect(state.cart).toHaveLength(0);
      expect(state.payments).toHaveLength(0);
      expect(state.globalDiscounts).toHaveLength(0);
      expect(state.pointsUsed).toBe(0);
    });
  });

  describe('cancelSale', () => {
    it('should clear context and cart', () => {
      useSaleStore.getState().startSale(mockContext);
      useSaleStore.getState().addToCart(mockCartItem);
      useSaleStore.getState().addPayment(mockPayment);

      useSaleStore.getState().cancelSale();

      const state = useSaleStore.getState();
      expect(state.currentContext).toBeNull();
      expect(state.cart).toHaveLength(0);
      expect(state.payments).toHaveLength(0);
    });
  });

  describe('cart management', () => {
    it('should add item to cart', () => {
      useSaleStore.getState().addToCart(mockCartItem);

      const cart = useSaleStore.getState().cart;
      expect(cart).toHaveLength(1);
      expect(cart[0]).toEqual(mockCartItem);
    });

    it('should add multiple items to cart', () => {
      const item2 = { ...mockCartItem, id: 'item-2', name: 'カラー', unitPrice: 8000 };

      useSaleStore.getState().addToCart(mockCartItem);
      useSaleStore.getState().addToCart(item2);

      expect(useSaleStore.getState().cart).toHaveLength(2);
    });

    it('should update cart item', () => {
      useSaleStore.getState().addToCart(mockCartItem);

      useSaleStore.getState().updateCartItem('item-1', { quantity: 2 });

      expect(useSaleStore.getState().cart[0].quantity).toBe(2);
    });

    it('should remove item from cart', () => {
      const item2 = { ...mockCartItem, id: 'item-2' };

      useSaleStore.getState().addToCart(mockCartItem);
      useSaleStore.getState().addToCart(item2);
      expect(useSaleStore.getState().cart).toHaveLength(2);

      useSaleStore.getState().removeFromCart('item-1');

      const cart = useSaleStore.getState().cart;
      expect(cart).toHaveLength(1);
      expect(cart[0].id).toBe('item-2');
    });

    it('should clear cart', () => {
      useSaleStore.getState().addToCart(mockCartItem);
      useSaleStore.getState().addToCart({ ...mockCartItem, id: 'item-2' });

      useSaleStore.getState().clearCart();

      expect(useSaleStore.getState().cart).toHaveLength(0);
    });
  });

  describe('payment management', () => {
    it('should add payment', () => {
      useSaleStore.getState().addPayment(mockPayment);

      const payments = useSaleStore.getState().payments;
      expect(payments).toHaveLength(1);
      expect(payments[0]).toEqual(mockPayment);
    });

    it('should remove payment by index', () => {
      const payment2 = { paymentMethod: 'credit_card' as const, amount: 3000 };

      useSaleStore.getState().addPayment(mockPayment);
      useSaleStore.getState().addPayment(payment2);

      useSaleStore.getState().removePayment(0);

      const payments = useSaleStore.getState().payments;
      expect(payments).toHaveLength(1);
      expect(payments[0].paymentMethod).toBe('credit_card');
    });

    it('should clear all payments', () => {
      useSaleStore.getState().addPayment(mockPayment);
      useSaleStore.getState().addPayment({ paymentMethod: 'credit_card' as const, amount: 3000 });

      useSaleStore.getState().clearPayments();

      expect(useSaleStore.getState().payments).toHaveLength(0);
    });
  });

  describe('discount management', () => {
    const mockDiscount = {
      type: 'percentage' as const,
      value: 10,
      reason: 'VIP割引',
    };

    it('should add global discount', () => {
      useSaleStore.getState().addGlobalDiscount(mockDiscount);

      const discounts = useSaleStore.getState().globalDiscounts;
      expect(discounts).toHaveLength(1);
      expect(discounts[0]).toEqual(mockDiscount);
    });

    it('should remove global discount by index', () => {
      const discount2 = { type: 'amount' as const, value: 500, reason: '特別割引' };

      useSaleStore.getState().addGlobalDiscount(mockDiscount);
      useSaleStore.getState().addGlobalDiscount(discount2);

      useSaleStore.getState().removeGlobalDiscount(0);

      const discounts = useSaleStore.getState().globalDiscounts;
      expect(discounts).toHaveLength(1);
      expect(discounts[0].type).toBe('amount');
    });
  });

  describe('points', () => {
    it('should set points used', () => {
      useSaleStore.getState().setPointsUsed(500);

      expect(useSaleStore.getState().pointsUsed).toBe(500);
    });
  });

  describe('cart totals calculation', () => {
    it('should calculate totals for single item', () => {
      useSaleStore.getState().addToCart({
        id: 'item-1',
        type: 'menu' as const,
        itemId: 'menu-1',
        name: 'カット',
        unitPrice: 5000,
        quantity: 1,
        taxRate: 10,
        staffAssignments: [],
        processAssignments: [],
        discounts: [],
      });

      const totals = useSaleStore.getState().getCartTotals();
      expect(totals.subtotal).toBe(5000);
      expect(totals.taxTotal).toBe(500); // 10% tax
      expect(totals.total).toBe(5500);
    });

    it('should calculate totals with quantity', () => {
      useSaleStore.getState().addToCart({
        id: 'item-1',
        type: 'menu' as const,
        itemId: 'menu-1',
        name: 'カット',
        unitPrice: 5000,
        quantity: 2,
        taxRate: 10,
        staffAssignments: [],
        processAssignments: [],
        discounts: [],
      });

      const totals = useSaleStore.getState().getCartTotals();
      expect(totals.subtotal).toBe(10000);
      expect(totals.total).toBe(11000);
    });

    it('should calculate totals with item discount', () => {
      useSaleStore.getState().addToCart({
        id: 'item-1',
        type: 'menu' as const,
        itemId: 'menu-1',
        name: 'カット',
        unitPrice: 5000,
        quantity: 1,
        taxRate: 10,
        staffAssignments: [],
        processAssignments: [],
        discounts: [{ type: 'amount' as const, value: 500, reason: '割引' }],
      });

      const totals = useSaleStore.getState().getCartTotals();
      expect(totals.subtotal).toBe(5000);
      expect(totals.discountTotal).toBe(500);
      expect(totals.taxTotal).toBe(450); // (5000-500) * 10%
      expect(totals.total).toBe(4950); // 5000 - 500 + 450
    });

    it('should calculate totals with points used', () => {
      useSaleStore.getState().addToCart({
        id: 'item-1',
        type: 'menu' as const,
        itemId: 'menu-1',
        name: 'カット',
        unitPrice: 5000,
        quantity: 1,
        taxRate: 10,
        staffAssignments: [],
        processAssignments: [],
        discounts: [],
      });
      useSaleStore.getState().setPointsUsed(500);

      const totals = useSaleStore.getState().getCartTotals();
      expect(totals.total).toBe(5000); // 5500 - 500 points
    });

    it('should calculate points earned', () => {
      useSaleStore.getState().addToCart({
        id: 'item-1',
        type: 'menu' as const,
        itemId: 'menu-1',
        name: 'カット',
        unitPrice: 10000,
        quantity: 1,
        taxRate: 10,
        staffAssignments: [],
        processAssignments: [],
        discounts: [],
      });

      const totals = useSaleStore.getState().getCartTotals(0.01); // 1% point rate
      expect(totals.pointsEarned).toBe(110); // 11000 * 0.01
    });
  });

  describe('sales history', () => {
    const mockSale = {
      id: 'sale-1',
      companyId: 'company-1',
      storeId: 'store-1',
      customerId: 'customer-1',
      visitId: 'visit-1',
      primaryStaffId: 'staff-1',
      nominationType: 'nominated' as const,
      nominationFee: 500,
      receiptNumber: 'S-001',
      subtotal: 5000,
      discountTotal: 0,
      taxTotal: 500,
      total: 5500,
      pointsEarned: 55,
      pointsUsed: 0,
      status: 'completed' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('should set sales', () => {
      useSaleStore.getState().setSales([mockSale]);

      expect(useSaleStore.getState().sales).toHaveLength(1);
    });

    it('should add sale to beginning of list', () => {
      const sale2 = { ...mockSale, id: 'sale-2', receiptNumber: 'S-002' };

      useSaleStore.getState().setSales([mockSale]);
      useSaleStore.getState().addSale(sale2);

      const sales = useSaleStore.getState().sales;
      expect(sales).toHaveLength(2);
      expect(sales[0].id).toBe('sale-2'); // Newest first
    });

    it('should set selected sale', () => {
      useSaleStore.getState().setSelectedSale(mockSale);

      expect(useSaleStore.getState().selectedSale).toEqual(mockSale);
    });
  });

  describe('state management', () => {
    it('should set processing state', () => {
      useSaleStore.getState().setProcessing(true);
      expect(useSaleStore.getState().isProcessing).toBe(true);
    });

    it('should set loading state', () => {
      useSaleStore.getState().setLoading(true);
      expect(useSaleStore.getState().isLoading).toBe(true);
    });

    it('should set error and stop processing', () => {
      useSaleStore.getState().setProcessing(true);
      useSaleStore.getState().setError('会計エラー');

      const state = useSaleStore.getState();
      expect(state.error).toBe('会計エラー');
      expect(state.isProcessing).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      useSaleStore.getState().startSale(mockContext);
      useSaleStore.getState().addToCart(mockCartItem);
      useSaleStore.getState().addPayment(mockPayment);
      useSaleStore.getState().setError('Error');

      useSaleStore.getState().reset();

      const state = useSaleStore.getState();
      expect(state.currentContext).toBeNull();
      expect(state.cart).toHaveLength(0);
      expect(state.payments).toHaveLength(0);
      expect(state.error).toBeNull();
    });
  });
});
