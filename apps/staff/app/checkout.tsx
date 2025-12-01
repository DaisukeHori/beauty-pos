import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Card, Button, Badge, Avatar, Modal, colors, spacing, textStyles, borderRadius } from '@beauty-pos/ui';
import { useAuthStore, useUIStore, formatCurrency } from '@beauty-pos/core';
import {
  saleService,
  visitService,
  menuService,
  productService,
  customerService,
  staffService,
  couponService,
  ticketService,
  pointService,
  printService,
  type VisitWithDetails,
  type Coupon,
  type Ticket,
} from '@beauty-pos/api';
import { getSupabaseClient } from '@beauty-pos/api';

type PaymentMethod = 'cash' | 'card' | 'electronic_money' | 'qr_payment' | 'credit';
type HairLength = 'short' | 'medium' | 'long';

interface MenuItem {
  id: string;
  name: string;
  basePrice: number;
  priceShort?: number;
  priceMedium?: number;
  priceLong?: number;
  taxRate: number;
}

interface ProductItem {
  id: string;
  name: string;
  price: number;
  taxRate: number;
  stock: number;
}

interface StaffMember {
  id: string;
  name: string;
  nominationFee: number;
}

interface CartItem {
  id: string;
  type: 'menu' | 'product';
  itemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  hairLength?: HairLength;
  hairLengthCharge: number;
  nominationType?: 'nomination' | 'free';
  nominationFee: number;
  taxRate: number;
  primaryStaffId?: string;
  primaryStaffName?: string;
  assistantStaffIds: string[];
}

interface Payment {
  method: PaymentMethod;
  amount: number;
}

interface Discount {
  type: 'manual' | 'coupon' | 'ticket' | 'points';
  name: string;
  value: number;
  valueType: 'percentage' | 'fixed';
  sourceId?: string;
}

interface CustomerInfo {
  id: string;
  name: string;
  phone: string;
  points: number;
}

const paymentMethods: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'cash', label: '現金', icon: '💴' },
  { key: 'card', label: 'クレジット', icon: '💳' },
  { key: 'electronic_money', label: '電子マネー', icon: '📱' },
  { key: 'qr_payment', label: 'QR決済', icon: '🔲' },
  { key: 'credit', label: '売掛', icon: '📝' },
];

export default function CheckoutScreen() {
  const params = useLocalSearchParams<{ visitId?: string }>();
  const { staff, company, store } = useAuthStore();
  const { showToast } = useUIStore();

  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [visit, setVisit] = useState<VisitWithDetails | null>(null);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);

  // Coupon/Ticket states
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [customerTickets, setCustomerTickets] = useState<Ticket[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [appliedTicket, setAppliedTicket] = useState<Ticket | null>(null);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [pointsToUse, setPointsToUse] = useState(0);

  // Modal states
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(null);

  // Payment input states
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [manualDiscountValue, setManualDiscountValue] = useState('');
  const [manualDiscountType, setManualDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [isProcessing, setIsProcessing] = useState(false);

  // Receipt state
  const [saleResult, setSaleResult] = useState<{
    saleId: string;
    invoiceNumber: string;
    pointsEarned: number;
  } | null>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!company?.id || !store?.id) return;

      try {
        // Load menus
        const menuData = await menuService.getActive(company.id, store.id);
        setMenus(menuData.map(m => ({
          id: m.id,
          name: m.name,
          basePrice: m.price,
          priceShort: m.price_short || m.price,
          priceMedium: m.price_medium || m.price,
          priceLong: m.price_long || m.price,
          taxRate: m.tax_rate || 10,
        })));

        // Load products
        const productData = await productService.getActive(company.id, store.id);
        setProducts(productData.map(p => ({
          id: p.id,
          name: p.name,
          price: p.selling_price,
          taxRate: p.tax_rate || 10,
          stock: p.stock_quantity || 0,
        })));

        // Load staff
        const staffData = await staffService.getByStore(store.id);
        setStaffList(staffData.map(s => ({
          id: s.id,
          name: `${s.last_name} ${s.first_name}`,
          nominationFee: s.nomination_fee || 0,
        })));

        // Load available coupons
        const couponsData = await couponService.getActive(company.id);
        setAvailableCoupons(couponsData);

        // Load visit if visitId provided
        if (params.visitId) {
          const visitData = await visitService.getById(params.visitId);
          if (visitData) {
            setVisit(visitData);

            // Load customer
            if (visitData.customer) {
              setCustomer({
                id: visitData.customer.id,
                name: `${visitData.customer.last_name} ${visitData.customer.first_name}`,
                phone: visitData.customer.phone || '',
                points: visitData.customer.points_balance || 0,
              });

              // Load customer tickets
              try {
                const ticketsData = await ticketService.getCustomerTickets(visitData.customer.id);
                setCustomerTickets(ticketsData.filter(t => t.remaining_uses > 0));
              } catch (e) {
                console.log('No tickets found for customer');
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to load checkout data:', error);
        showToast('データの読み込みに失敗しました', 'error');
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadData();
  }, [company?.id, store?.id, params.visitId, showToast]);

  // Calculate totals
  const calculateItemPrice = (item: CartItem): number => {
    return (item.basePrice + item.hairLengthCharge + item.nominationFee) * item.quantity;
  };

  const subtotal = cartItems.reduce((sum, item) => sum + calculateItemPrice(item), 0);

  const calculateDiscountAmount = (): number => {
    return discounts.reduce((sum, discount) => {
      if (discount.valueType === 'percentage') {
        return sum + Math.floor(subtotal * discount.value / 100);
      }
      return sum + discount.value;
    }, 0) + pointsToUse;
  };

  const discountTotal = calculateDiscountAmount();
  const tax10Amount = Math.floor(cartItems
    .filter(item => item.taxRate === 10)
    .reduce((sum, item) => sum + calculateItemPrice(item), 0) * 10 / 110);
  const tax8Amount = Math.floor(cartItems
    .filter(item => item.taxRate === 8)
    .reduce((sum, item) => sum + calculateItemPrice(item), 0) * 8 / 108);
  const grandTotal = Math.max(0, subtotal - discountTotal);
  const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = grandTotal - paidAmount;

  // Add menu to cart
  const addMenuToCart = (menu: MenuItem, hairLength: HairLength = 'medium') => {
    const price = hairLength === 'short' ? (menu.priceShort || menu.basePrice)
      : hairLength === 'long' ? (menu.priceLong || menu.basePrice)
      : (menu.priceMedium || menu.basePrice);

    const hairLengthCharge = price - menu.basePrice;

    const newItem: CartItem = {
      id: `cart-${Date.now()}`,
      type: 'menu',
      itemId: menu.id,
      name: menu.name,
      basePrice: menu.basePrice,
      quantity: 1,
      hairLength,
      hairLengthCharge,
      nominationType: visit?.staff_id ? 'nomination' : 'free',
      nominationFee: visit?.staff_id ? (staffList.find(s => s.id === visit.staff_id)?.nominationFee || 0) : 0,
      taxRate: menu.taxRate,
      primaryStaffId: visit?.staff_id || staff?.id,
      primaryStaffName: visit?.staff
        ? `${visit.staff.last_name} ${visit.staff.first_name}`
        : `${staff?.lastName} ${staff?.firstName}`,
      assistantStaffIds: [],
    };

    setCartItems([...cartItems, newItem]);
    setShowMenuModal(false);
  };

  // Add product to cart
  const addProductToCart = (product: ProductItem) => {
    const existingItem = cartItems.find(item => item.itemId === product.id && item.type === 'product');

    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === existingItem.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newItem: CartItem = {
        id: `cart-${Date.now()}`,
        type: 'product',
        itemId: product.id,
        name: product.name,
        basePrice: product.price,
        quantity: 1,
        hairLengthCharge: 0,
        nominationFee: 0,
        taxRate: product.taxRate,
        assistantStaffIds: [],
      };
      setCartItems([...cartItems, newItem]);
    }
    setShowProductModal(false);
  };

  // Remove item from cart
  const removeFromCart = (itemId: string) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };

  // Update item quantity
  const updateQuantity = (itemId: string, delta: number) => {
    setCartItems(cartItems.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  // Set nomination for item
  const setNomination = (staffMember: StaffMember) => {
    if (!selectedCartItemId) return;

    setCartItems(cartItems.map(item => {
      if (item.id === selectedCartItemId) {
        return {
          ...item,
          nominationType: 'nomination' as const,
          nominationFee: staffMember.nominationFee,
          primaryStaffId: staffMember.id,
          primaryStaffName: staffMember.name,
        };
      }
      return item;
    }));
    setShowStaffModal(false);
    setSelectedCartItemId(null);
  };

  // Add payment
  const addPayment = () => {
    const amount = parseInt(paymentAmount) || 0;
    if (amount <= 0) return;

    setPayments([...payments, { method: selectedPaymentMethod, amount }]);
    setPaymentAmount('');
    setShowPaymentModal(false);
  };

  // Remove payment
  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  // Add manual discount
  const addManualDiscount = () => {
    const value = parseInt(manualDiscountValue) || 0;
    if (value <= 0) return;

    const newDiscount: Discount = {
      type: 'manual',
      name: manualDiscountType === 'percentage' ? `${value}%割引` : `¥${value}割引`,
      value,
      valueType: manualDiscountType,
    };

    setDiscounts([...discounts, newDiscount]);
    setManualDiscountValue('');
    setShowDiscountModal(false);
  };

  // Apply coupon by code
  const applyCouponByCode = async () => {
    if (!couponCode.trim() || !company?.id) return;

    try {
      const coupon = await couponService.validateCode(company.id, couponCode.trim());
      if (coupon) {
        applyCoupon(coupon);
        setCouponCode('');
      } else {
        Alert.alert('エラー', '無効なクーポンコードです');
      }
    } catch (error) {
      Alert.alert('エラー', 'クーポンの確認に失敗しました');
    }
  };

  // Apply coupon
  const applyCoupon = (coupon: Coupon) => {
    if (appliedCoupon) {
      Alert.alert('エラー', 'クーポンは1つのみ適用できます');
      return;
    }

    const discountValue = coupon.discount_type === 'percentage'
      ? coupon.discount_value
      : coupon.discount_type === 'fixed'
        ? coupon.discount_value
        : 0;

    const discountName = coupon.discount_type === 'percentage'
      ? `${coupon.name} (${coupon.discount_value}%OFF)`
      : coupon.discount_type === 'fixed'
        ? `${coupon.name} (¥${coupon.discount_value}OFF)`
        : `${coupon.name} (無料施術)`;

    const newDiscount: Discount = {
      type: 'coupon',
      name: discountName,
      value: discountValue,
      valueType: coupon.discount_type === 'percentage' ? 'percentage' : 'fixed',
      sourceId: coupon.id,
    };

    setDiscounts([...discounts, newDiscount]);
    setAppliedCoupon(coupon);
    setShowCouponModal(false);
  };

  // Remove coupon
  const removeCoupon = () => {
    setDiscounts(discounts.filter(d => d.type !== 'coupon'));
    setAppliedCoupon(null);
  };

  // Apply ticket
  const applyTicket = (ticket: Ticket) => {
    if (appliedTicket) {
      Alert.alert('エラー', '回数券は1つのみ適用できます');
      return;
    }

    // Find matching menu item in cart
    const matchingCartItem = cartItems.find(item =>
      item.type === 'menu' && item.itemId === ticket.menu_id
    );

    if (!matchingCartItem) {
      Alert.alert('エラー', 'この回数券に対応するメニューがカートにありません');
      return;
    }

    const discountValue = matchingCartItem.basePrice + matchingCartItem.hairLengthCharge;

    const newDiscount: Discount = {
      type: 'ticket',
      name: `${ticket.menu?.name || '回数券'} (回数券利用)`,
      value: discountValue,
      valueType: 'fixed',
      sourceId: ticket.id,
    };

    setDiscounts([...discounts, newDiscount]);
    setAppliedTicket(ticket);
    setShowTicketModal(false);
  };

  // Remove ticket
  const removeTicket = () => {
    setDiscounts(discounts.filter(d => d.type !== 'ticket'));
    setAppliedTicket(null);
  };

  // Remove discount
  const removeDiscount = (index: number) => {
    setDiscounts(discounts.filter((_, i) => i !== index));
  };

  // Process checkout
  const processCheckout = async () => {
    if (!company?.id || !store?.id) return;

    if (cartItems.length === 0) {
      Alert.alert('エラー', 'カートにアイテムがありません');
      return;
    }

    if (remainingAmount > 0) {
      Alert.alert('エラー', '支払い金額が不足しています');
      return;
    }

    setIsProcessing(true);

    try {
      // Build sale items
      const saleItems = cartItems.map(item => ({
        type: item.type,
        itemId: item.itemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.basePrice + item.hairLengthCharge,
        nominationFee: item.nominationFee,
        taxRate: item.taxRate,
        primaryStaffId: item.primaryStaffId,
        assistantStaffIds: item.assistantStaffIds,
      }));

      // Build sale payments
      const salePayments = payments.map(p => ({
        method: p.method,
        amount: p.amount,
      }));

      // Build discounts
      const saleDiscounts = discounts.map(d => ({
        type: d.type,
        name: d.name,
        value: d.value,
        valueType: d.valueType,
        sourceId: d.sourceId,
      }));

      // Call calculate-sale Edge Function first
      const supabase = getSupabaseClient();
      const { data: calcResult, error: calcError } = await supabase.functions.invoke('calculate-sale', {
        body: {
          items: saleItems,
          payments: salePayments,
          discounts: saleDiscounts,
          pointsUsed: pointsToUse,
          customerId: customer?.id,
        },
      });

      if (calcError) throw calcError;

      // Create sale record
      const saleNumber = await saleService.generateSaleNumber(company.id);
      const sale = await saleService.createSimple({
        company_id: company.id,
        store_id: store.id,
        customer_id: customer?.id || null,
        staff_id: staff?.id || null,
        visit_id: params.visitId || null,
        sale_number: saleNumber,
        sale_date: new Date().toISOString(),
        subtotal: calcResult.subtotal,
        discount_total: calcResult.discountTotal,
        tax_total: calcResult.tax10 + calcResult.tax8,
        total: calcResult.grandTotal,
        points_used: pointsToUse,
        points_earned: calcResult.pointsEarned || 0,
        status: 'completed',
      });

      // Create sale items
      for (const item of cartItems) {
        await saleService.addItem(sale.id, {
          sale_id: sale.id,
          item_type: item.type,
          menu_id: item.type === 'menu' ? item.itemId : null,
          product_id: item.type === 'product' ? item.itemId : null,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.basePrice + item.hairLengthCharge,
          nomination_fee: item.nominationFee,
          tax_rate: item.taxRate,
          subtotal: calculateItemPrice(item),
          staff_id: item.primaryStaffId || null,
        });
      }

      // Create sale payments
      for (const payment of payments) {
        await saleService.addPayment(sale.id, {
          sale_id: sale.id,
          payment_method: payment.method,
          amount: payment.amount,
        });
      }

      // Update visit status if applicable
      if (params.visitId) {
        await visitService.checkOut(params.visitId);
      }

      // Record coupon usage if applied
      if (appliedCoupon && customer?.id) {
        try {
          await couponService.use(appliedCoupon.id, customer.id, sale.id);
        } catch (e) {
          console.error('Failed to record coupon usage:', e);
        }
      }

      // Record ticket usage if applied
      if (appliedTicket) {
        try {
          await ticketService.use(appliedTicket.id, sale.id, staff?.id || undefined);
        } catch (e) {
          console.error('Failed to record ticket usage:', e);
        }
      }

      // Record point transaction if points were used
      if (pointsToUse > 0 && customer?.id) {
        try {
          await pointService.usePoints(company.id, customer.id, pointsToUse, sale.id, '会計でのポイント使用');
        } catch (e) {
          console.error('Failed to record point usage:', e);
        }
      }

      // Record earned points
      if (calcResult.pointsEarned > 0 && customer?.id) {
        try {
          await pointService.earnPoints(company.id, customer.id, calcResult.pointsEarned, sale.id, '会計でのポイント獲得');
        } catch (e) {
          console.error('Failed to record earned points:', e);
        }
      }

      // Update customer points if applicable
      // Note: total_spent is updated by the calculate-sale Edge Function
      if (customer?.id) {
        await customerService.update(customer.id, {
          points_balance: (customer.points - pointsToUse + (calcResult.pointsEarned || 0)),
          last_visit_at: new Date().toISOString(),
        });
      }

      // Set result for receipt
      setSaleResult({
        saleId: sale.id,
        invoiceNumber: sale.sale_number || '',
        pointsEarned: calcResult.pointsEarned || 0,
      });

      // Show receipt preview
      setShowReceiptPreview(true);
      showToast('会計が完了しました', 'success');
    } catch (error) {
      console.error('Checkout failed:', error);
      Alert.alert('エラー', '会計処理に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  // Print receipt
  const printReceipt = async () => {
    if (!saleResult?.saleId) return;

    try {
      showToast('レシートを印刷しています...', 'info');

      const result = await printService.printReceipt(saleResult.saleId);

      if (result.success) {
        showToast('レシートを印刷しました', 'success');
      } else {
        // If network printing fails, try to show receipt preview for manual print
        const receiptData = await printService.buildReceiptData(saleResult.saleId);
        if (receiptData) {
          const html = printService.generateReceiptHtml(receiptData);
          // In a production app, we would open a WebView or native print dialog
          console.log('Receipt HTML generated for manual printing');
          showToast('印刷準備完了 - 手動で印刷してください', 'info');
        } else {
          showToast('印刷データの取得に失敗しました', 'error');
        }
      }
    } catch (error) {
      console.error('Print error:', error);
      showToast('印刷に失敗しました', 'error');
    }
  };

  // Complete and close
  const completeAndClose = () => {
    setShowReceiptPreview(false);
    router.back();
  };

  // Render cart item
  const renderCartItem = (item: CartItem) => (
    <View key={item.id} style={styles.cartItem}>
      <View style={styles.cartItemHeader}>
        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemName}>{item.name}</Text>
          {item.hairLength && (
            <Badge colorScheme="neutral" size="sm" style={styles.itemBadge}>
              {item.hairLength === 'short' ? 'S' : item.hairLength === 'long' ? 'L' : 'M'}
            </Badge>
          )}
          {item.nominationType === 'nomination' && (
            <Badge colorScheme="primary" size="sm" style={styles.itemBadge}>
              指名
            </Badge>
          )}
        </View>
        <TouchableOpacity onPress={() => removeFromCart(item.id)}>
          <Text style={styles.removeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cartItemDetails}>
        <View style={styles.quantityControl}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, -1)}
          >
            <Text style={styles.quantityButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, 1)}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.priceBreakdown}>
          <Text style={styles.priceText}>{formatCurrency(item.basePrice)}</Text>
          {item.hairLengthCharge !== 0 && (
            <Text style={styles.chargeText}>
              +{formatCurrency(item.hairLengthCharge)} (ロング料金)
            </Text>
          )}
          {item.nominationFee > 0 && (
            <Text style={styles.chargeText}>
              +{formatCurrency(item.nominationFee)} (指名料)
            </Text>
          )}
        </View>

        <Text style={styles.itemTotal}>{formatCurrency(calculateItemPrice(item))}</Text>
      </View>

      {item.type === 'menu' && (
        <View style={styles.staffAssignment}>
          <Text style={styles.staffLabel}>担当:</Text>
          <Text style={styles.staffName}>{item.primaryStaffName || '未設定'}</Text>
          <TouchableOpacity
            style={styles.changeStaffButton}
            onPress={() => {
              setSelectedCartItemId(item.id);
              setShowStaffModal(true);
            }}
          >
            <Text style={styles.changeStaffText}>変更</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (isInitialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>会計</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        {/* Left Panel - Cart */}
        <View style={styles.leftPanel}>
          {/* Customer Info */}
          {customer && (
            <Card variant="outlined" size="sm" style={styles.customerCard}>
              <View style={styles.customerInfo}>
                <Avatar name={customer.name} size="md" />
                <View style={styles.customerDetails}>
                  <Text style={styles.customerName}>{customer.name}</Text>
                  <Text style={styles.customerPhone}>{customer.phone}</Text>
                </View>
                <View style={styles.pointsInfo}>
                  <Text style={styles.pointsLabel}>ポイント</Text>
                  <Text style={styles.pointsValue}>{customer.points.toLocaleString()} pt</Text>
                </View>
              </View>
            </Card>
          )}

          {/* Cart Items */}
          <View style={styles.cartContainer}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>カート ({cartItems.length})</Text>
              <View style={styles.addButtons}>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowMenuModal(true)}
                >
                  <Text style={styles.addButtonText}>+ メニュー</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowProductModal(true)}
                >
                  <Text style={styles.addButtonText}>+ 商品</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.cartScroll} showsVerticalScrollIndicator={false}>
              {cartItems.length === 0 ? (
                <View style={styles.emptyCart}>
                  <Text style={styles.emptyCartIcon}>🛒</Text>
                  <Text style={styles.emptyCartText}>カートは空です</Text>
                </View>
              ) : (
                cartItems.map(renderCartItem)
              )}
            </ScrollView>
          </View>
        </View>

        {/* Right Panel - Summary & Payment */}
        <View style={styles.rightPanel}>
          {/* Discounts */}
          <Card variant="outlined" size="md" style={styles.summaryCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>割引・ポイント</Text>
              <TouchableOpacity onPress={() => setShowDiscountModal(true)}>
                <Text style={styles.addLink}>+ 追加</Text>
              </TouchableOpacity>
            </View>

            {discounts.map((discount, index) => (
              <View key={index} style={styles.discountItem}>
                <Text style={styles.discountName}>{discount.name}</Text>
                <View style={styles.discountRight}>
                  <Text style={styles.discountAmount}>
                    -{discount.valueType === 'percentage'
                      ? formatCurrency(Math.floor(subtotal * discount.value / 100))
                      : formatCurrency(discount.value)}
                  </Text>
                  <TouchableOpacity onPress={() => removeDiscount(index)}>
                    <Text style={styles.removeSmall}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Points Usage */}
            {customer && (
              <View style={styles.pointsUsage}>
                <Text style={styles.pointsUsageLabel}>ポイント使用</Text>
                <View style={styles.pointsInputContainer}>
                  <TextInput
                    style={styles.pointsInput}
                    value={pointsToUse.toString()}
                    onChangeText={(text) => {
                      const value = parseInt(text) || 0;
                      setPointsToUse(Math.min(value, customer.points, grandTotal));
                    }}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                  <Text style={styles.pointsSuffix}>pt</Text>
                  <TouchableOpacity
                    style={styles.useAllButton}
                    onPress={() => setPointsToUse(Math.min(customer.points, subtotal - calculateDiscountAmount() + pointsToUse))}
                  >
                    <Text style={styles.useAllText}>全使用</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Card>

          {/* Payment Methods */}
          <Card variant="outlined" size="md" style={styles.summaryCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>お支払い</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(true)}>
                <Text style={styles.addLink}>+ 追加</Text>
              </TouchableOpacity>
            </View>

            {payments.map((payment, index) => (
              <View key={index} style={styles.paymentItem}>
                <Text style={styles.paymentMethod}>
                  {paymentMethods.find(m => m.key === payment.method)?.icon}{' '}
                  {paymentMethods.find(m => m.key === payment.method)?.label}
                </Text>
                <View style={styles.paymentRight}>
                  <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                  <TouchableOpacity onPress={() => removePayment(index)}>
                    <Text style={styles.removeSmall}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {payments.length === 0 && (
              <Text style={styles.noPaymentText}>支払い方法を追加してください</Text>
            )}
          </Card>

          {/* Summary */}
          <Card variant="elevated" size="md" style={styles.totalCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>小計</Text>
              <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
            </View>
            {discountTotal > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>割引合計</Text>
                <Text style={[styles.summaryValue, styles.discountValue]}>
                  -{formatCurrency(discountTotal)}
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>内消費税(10%)</Text>
              <Text style={styles.summaryValue}>{formatCurrency(tax10Amount)}</Text>
            </View>
            {tax8Amount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>内消費税(8%)</Text>
                <Text style={styles.summaryValue}>{formatCurrency(tax8Amount)}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>合計</Text>
              <Text style={styles.totalValue}>{formatCurrency(grandTotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>お預かり</Text>
              <Text style={styles.summaryValue}>{formatCurrency(paidAmount)}</Text>
            </View>
            {remainingAmount > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.remainingLabel]}>不足</Text>
                <Text style={[styles.summaryValue, styles.remainingValue]}>
                  {formatCurrency(remainingAmount)}
                </Text>
              </View>
            ) : paidAmount > grandTotal ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>お釣り</Text>
                <Text style={[styles.summaryValue, styles.changeValue]}>
                  {formatCurrency(paidAmount - grandTotal)}
                </Text>
              </View>
            ) : null}
          </Card>

          {/* Checkout Button */}
          <Button
            size="xl"
            fullWidth
            onPress={processCheckout}
            isLoading={isProcessing}
            isDisabled={cartItems.length === 0 || remainingAmount > 0}
            style={styles.checkoutButton}
          >
            会計を確定する
          </Button>
        </View>
      </View>

      {/* Menu Selection Modal */}
      <Modal
        visible={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        title="メニュー選択"
        size="lg"
      >
        <ScrollView style={styles.modalScroll}>
          <View style={styles.menuGrid}>
            {menus.map((menu) => (
              <TouchableOpacity
                key={menu.id}
                style={styles.menuItem}
                onPress={() => addMenuToCart(menu)}
              >
                <Text style={styles.menuName}>{menu.name}</Text>
                <Text style={styles.menuPrice}>{formatCurrency(menu.basePrice)}〜</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </Modal>

      {/* Product Selection Modal */}
      <Modal
        visible={showProductModal}
        onClose={() => setShowProductModal(false)}
        title="商品選択"
        size="lg"
      >
        <ScrollView style={styles.modalScroll}>
          <View style={styles.menuGrid}>
            {products.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={[styles.menuItem, product.stock <= 0 && styles.outOfStock]}
                onPress={() => product.stock > 0 && addProductToCart(product)}
                disabled={product.stock <= 0}
              >
                <Text style={styles.menuName}>{product.name}</Text>
                <Text style={styles.menuPrice}>{formatCurrency(product.price)}</Text>
                {product.stock <= 0 && <Text style={styles.outOfStockText}>在庫切れ</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </Modal>

      {/* Staff Selection Modal */}
      <Modal
        visible={showStaffModal}
        onClose={() => {
          setShowStaffModal(false);
          setSelectedCartItemId(null);
        }}
        title="担当者選択"
        size="md"
      >
        <ScrollView style={styles.modalScroll}>
          {staffList.map((staffMember) => (
            <TouchableOpacity
              key={staffMember.id}
              style={styles.staffItem}
              onPress={() => setNomination(staffMember)}
            >
              <Text style={styles.staffItemName}>{staffMember.name}</Text>
              {staffMember.nominationFee > 0 && (
                <Text style={styles.staffItemFee}>
                  指名料: {formatCurrency(staffMember.nominationFee)}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="支払い追加"
        size="md"
      >
        <View style={styles.paymentMethods}>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.key}
              style={[
                styles.paymentMethodButton,
                selectedPaymentMethod === method.key && styles.paymentMethodSelected,
              ]}
              onPress={() => setSelectedPaymentMethod(method.key)}
            >
              <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
              <Text style={[
                styles.paymentMethodLabel,
                selectedPaymentMethod === method.key && styles.paymentMethodLabelSelected,
              ]}>
                {method.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.paymentInputContainer}>
          <Text style={styles.inputLabel}>金額</Text>
          <TextInput
            style={styles.paymentInput}
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            keyboardType="number-pad"
            placeholder={remainingAmount > 0 ? remainingAmount.toString() : '0'}
          />
          <TouchableOpacity
            style={styles.exactButton}
            onPress={() => setPaymentAmount(remainingAmount > 0 ? remainingAmount.toString() : grandTotal.toString())}
          >
            <Text style={styles.exactButtonText}>ぴったり</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickAmounts}>
          {[1000, 5000, 10000].map((amount) => (
            <TouchableOpacity
              key={amount}
              style={styles.quickAmountButton}
              onPress={() => setPaymentAmount(amount.toString())}
            >
              <Text style={styles.quickAmountText}>{formatCurrency(amount)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button fullWidth onPress={addPayment} style={styles.modalButton}>
          追加
        </Button>
      </Modal>

      {/* Discount Modal */}
      <Modal
        visible={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        title="割引追加"
        size="md"
      >
        {/* Coupon and Ticket buttons */}
        <View style={styles.discountOptionsRow}>
          <TouchableOpacity
            style={[styles.discountOptionButton, appliedCoupon && styles.discountOptionDisabled]}
            onPress={() => {
              setShowDiscountModal(false);
              setShowCouponModal(true);
            }}
            disabled={!!appliedCoupon}
          >
            <Text style={styles.discountOptionIcon}>🎟️</Text>
            <Text style={styles.discountOptionText}>クーポン</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.discountOptionButton, (appliedTicket || customerTickets.length === 0) && styles.discountOptionDisabled]}
            onPress={() => {
              setShowDiscountModal(false);
              setShowTicketModal(true);
            }}
            disabled={!!appliedTicket || customerTickets.length === 0}
          >
            <Text style={styles.discountOptionIcon}>🎫</Text>
            <Text style={styles.discountOptionText}>回数券</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.discountDivider}>
          <View style={styles.discountDividerLine} />
          <Text style={styles.discountDividerText}>または手動割引</Text>
          <View style={styles.discountDividerLine} />
        </View>

        <View style={styles.discountTypeSelector}>
          <TouchableOpacity
            style={[
              styles.discountTypeButton,
              manualDiscountType === 'fixed' && styles.discountTypeSelected,
            ]}
            onPress={() => setManualDiscountType('fixed')}
          >
            <Text style={[
              styles.discountTypeText,
              manualDiscountType === 'fixed' && styles.discountTypeTextSelected,
            ]}>
              金額割引
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.discountTypeButton,
              manualDiscountType === 'percentage' && styles.discountTypeSelected,
            ]}
            onPress={() => setManualDiscountType('percentage')}
          >
            <Text style={[
              styles.discountTypeText,
              manualDiscountType === 'percentage' && styles.discountTypeTextSelected,
            ]}>
              ％割引
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.discountInputContainer}>
          <TextInput
            style={styles.discountInput}
            value={manualDiscountValue}
            onChangeText={setManualDiscountValue}
            keyboardType="number-pad"
            placeholder="0"
          />
          <Text style={styles.discountSuffix}>
            {manualDiscountType === 'percentage' ? '%' : '円'}
          </Text>
        </View>

        <Button fullWidth onPress={addManualDiscount} style={styles.modalButton}>
          追加
        </Button>
      </Modal>

      {/* Coupon Modal */}
      <Modal
        visible={showCouponModal}
        onClose={() => setShowCouponModal(false)}
        title="クーポン選択"
        size="md"
      >
        {/* Coupon code input */}
        <View style={styles.couponCodeSection}>
          <Text style={styles.couponCodeLabel}>クーポンコード入力</Text>
          <View style={styles.couponCodeInputRow}>
            <TextInput
              style={styles.couponCodeInput}
              value={couponCode}
              onChangeText={setCouponCode}
              placeholder="クーポンコードを入力"
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.couponCodeButton} onPress={applyCouponByCode}>
              <Text style={styles.couponCodeButtonText}>適用</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.discountDivider}>
          <View style={styles.discountDividerLine} />
          <Text style={styles.discountDividerText}>または選択</Text>
          <View style={styles.discountDividerLine} />
        </View>

        <ScrollView style={styles.couponList}>
          {availableCoupons.length === 0 ? (
            <Text style={styles.noCouponsText}>利用可能なクーポンがありません</Text>
          ) : (
            availableCoupons.map((coupon) => (
              <TouchableOpacity
                key={coupon.id}
                style={styles.couponItem}
                onPress={() => applyCoupon(coupon)}
              >
                <View style={styles.couponItemLeft}>
                  <Text style={styles.couponItemName}>{coupon.name}</Text>
                  <Text style={styles.couponItemDesc}>
                    {coupon.discount_type === 'percentage'
                      ? `${coupon.discount_value}% OFF`
                      : coupon.discount_type === 'fixed'
                        ? `¥${coupon.discount_value} OFF`
                        : '無料施術'}
                  </Text>
                  {coupon.valid_until && (
                    <Text style={styles.couponItemExpiry}>
                      有効期限: {new Date(coupon.valid_until).toLocaleDateString('ja-JP')}
                    </Text>
                  )}
                </View>
                <Text style={styles.couponItemArrow}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </Modal>

      {/* Ticket Modal */}
      <Modal
        visible={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        title="回数券選択"
        size="md"
      >
        <ScrollView style={styles.ticketList}>
          {customerTickets.length === 0 ? (
            <Text style={styles.noTicketsText}>利用可能な回数券がありません</Text>
          ) : (
            customerTickets.map((ticket) => {
              const hasMatchingItem = cartItems.some(
                item => item.type === 'menu' && item.itemId === ticket.menu_id
              );

              return (
                <TouchableOpacity
                  key={ticket.id}
                  style={[styles.ticketItem, !hasMatchingItem && styles.ticketItemDisabled]}
                  onPress={() => hasMatchingItem && applyTicket(ticket)}
                  disabled={!hasMatchingItem}
                >
                  <View style={styles.ticketItemLeft}>
                    <Text style={styles.ticketItemName}>{ticket.menu?.name || '回数券'}</Text>
                    <Text style={styles.ticketItemRemaining}>
                      残り {ticket.remaining_uses} 回
                    </Text>
                    {ticket.expires_at && (
                      <Text style={styles.ticketItemExpiry}>
                        有効期限: {new Date(ticket.expires_at).toLocaleDateString('ja-JP')}
                      </Text>
                    )}
                  </View>
                  {hasMatchingItem ? (
                    <Text style={styles.ticketItemArrow}>›</Text>
                  ) : (
                    <Text style={styles.ticketItemHint}>カートにメニューを追加</Text>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </Modal>

      {/* Receipt Preview Modal */}
      <Modal
        visible={showReceiptPreview}
        onClose={completeAndClose}
        title="会計完了"
        size="lg"
        showCloseButton={false}
      >
        <View style={styles.receiptPreview}>
          <Text style={styles.receiptSuccessIcon}>✓</Text>
          <Text style={styles.receiptSuccessText}>会計が完了しました</Text>
          <Text style={styles.receiptTotal}>{formatCurrency(grandTotal)}</Text>

          {paidAmount > grandTotal && (
            <View style={styles.changeInfo}>
              <Text style={styles.changeLabel}>お釣り</Text>
              <Text style={styles.changeAmount}>{formatCurrency(paidAmount - grandTotal)}</Text>
            </View>
          )}

          {saleResult && (
            <View style={styles.saleInfo}>
              <Text style={styles.invoiceNumber}>伝票番号: {saleResult.invoiceNumber}</Text>
              {saleResult.pointsEarned > 0 && (
                <Text style={styles.pointsEarned}>
                  獲得ポイント: {saleResult.pointsEarned} pt
                </Text>
              )}
            </View>
          )}

          <View style={styles.receiptActions}>
            <Button
              variant="outline"
              fullWidth
              onPress={printReceipt}
              style={styles.receiptButton}
            >
              🖨️ レシート印刷
            </Button>
            <Button
              fullWidth
              onPress={completeAndClose}
            >
              完了
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[100],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
  },
  loadingText: {
    ...textStyles.body,
    color: colors.neutral[500],
    marginTop: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backButton: {
    padding: spacing[2],
  },
  backButtonText: {
    ...textStyles.body,
    color: colors.primary[500],
  },
  headerTitle: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  headerRight: {
    width: 60,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    flex: 3,
    padding: spacing[3],
  },
  rightPanel: {
    flex: 2,
    backgroundColor: colors.white,
    padding: spacing[3],
    borderLeftWidth: 1,
    borderLeftColor: colors.neutral[200],
  },
  customerCard: {
    marginBottom: spacing[3],
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerDetails: {
    flex: 1,
    marginLeft: spacing[3],
  },
  customerName: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  customerPhone: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
  },
  pointsInfo: {
    alignItems: 'flex-end',
  },
  pointsLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  pointsValue: {
    ...textStyles.label,
    color: colors.primary[600],
  },
  cartContainer: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing[3],
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  cartTitle: {
    ...textStyles.h6,
    color: colors.neutral[900],
  },
  addButtons: {
    flexDirection: 'row',
  },
  addButton: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.lg,
    marginLeft: spacing[2],
  },
  addButtonText: {
    ...textStyles.labelSm,
    color: colors.primary[600],
  },
  cartScroll: {
    flex: 1,
  },
  emptyCart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
  },
  emptyCartIcon: {
    fontSize: 48,
    marginBottom: spacing[3],
  },
  emptyCartText: {
    ...textStyles.body,
    color: colors.neutral[400],
  },
  cartItem: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  cartItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  cartItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartItemName: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  itemBadge: {
    marginLeft: spacing[1],
  },
  removeButton: {
    ...textStyles.body,
    color: colors.neutral[400],
    padding: spacing[1],
  },
  cartItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing[1],
  },
  quantityButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
  },
  quantityButtonText: {
    ...textStyles.label,
    color: colors.neutral[700],
  },
  quantityText: {
    ...textStyles.label,
    color: colors.neutral[900],
    marginHorizontal: spacing[3],
  },
  priceBreakdown: {
    flex: 1,
    marginHorizontal: spacing[3],
  },
  priceText: {
    ...textStyles.bodySm,
    color: colors.neutral[700],
  },
  chargeText: {
    ...textStyles.caption,
    color: colors.neutral[500],
  },
  itemTotal: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  staffAssignment: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  staffLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginRight: spacing[1],
  },
  staffName: {
    ...textStyles.bodySm,
    color: colors.neutral[700],
    flex: 1,
  },
  changeStaffButton: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
  },
  changeStaffText: {
    ...textStyles.caption,
    color: colors.primary[500],
  },
  summaryCard: {
    marginBottom: spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  sectionTitle: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  addLink: {
    ...textStyles.bodySm,
    color: colors.primary[500],
  },
  discountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  discountName: {
    ...textStyles.bodySm,
    color: colors.neutral[700],
  },
  discountRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountAmount: {
    ...textStyles.bodySm,
    color: colors.error[500],
  },
  removeSmall: {
    ...textStyles.caption,
    color: colors.neutral[400],
    marginLeft: spacing[2],
    padding: spacing[1],
  },
  pointsUsage: {
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  pointsUsageLabel: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[1],
  },
  pointsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsInput: {
    flex: 1,
    height: 36,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    ...textStyles.body,
  },
  pointsSuffix: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
    marginLeft: spacing[1],
  },
  useAllButton: {
    marginLeft: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
  },
  useAllText: {
    ...textStyles.caption,
    color: colors.primary[600],
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1.5],
  },
  paymentMethod: {
    ...textStyles.bodySm,
    color: colors.neutral[700],
  },
  paymentRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentAmount: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  noPaymentText: {
    ...textStyles.bodySm,
    color: colors.neutral[400],
    textAlign: 'center',
    paddingVertical: spacing[2],
  },
  totalCard: {
    marginBottom: spacing[3],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  summaryLabel: {
    ...textStyles.bodySm,
    color: colors.neutral[600],
  },
  summaryValue: {
    ...textStyles.body,
    color: colors.neutral[900],
  },
  discountValue: {
    color: colors.error[500],
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing[2],
  },
  totalLabel: {
    ...textStyles.h5,
    color: colors.neutral[900],
  },
  totalValue: {
    ...textStyles.h4,
    color: colors.primary[600],
  },
  remainingLabel: {
    color: colors.error[500],
  },
  remainingValue: {
    color: colors.error[500],
    fontWeight: 'bold',
  },
  changeValue: {
    color: colors.success[600],
    fontWeight: 'bold',
  },
  checkoutButton: {
    marginTop: 'auto',
  },
  modalScroll: {
    maxHeight: 400,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing[1],
  },
  menuItem: {
    width: '33.33%',
    padding: spacing[1],
  },
  outOfStock: {
    opacity: 0.5,
  },
  outOfStockText: {
    ...textStyles.caption,
    color: colors.error[500],
    textAlign: 'center',
  },
  menuName: {
    ...textStyles.label,
    color: colors.neutral[900],
    backgroundColor: colors.neutral[50],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    textAlign: 'center',
    marginBottom: spacing[1],
  },
  menuPrice: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  staffItem: {
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  staffItemName: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  staffItemFee: {
    ...textStyles.caption,
    color: colors.primary[600],
    marginTop: spacing[0.5],
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing[4],
  },
  paymentMethodButton: {
    width: '33.33%',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral[50],
    marginBottom: spacing[1],
  },
  paymentMethodSelected: {
    backgroundColor: colors.primary[50],
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  paymentMethodIcon: {
    fontSize: 24,
    marginBottom: spacing[1],
  },
  paymentMethodLabel: {
    ...textStyles.caption,
    color: colors.neutral[600],
  },
  paymentMethodLabelSelected: {
    color: colors.primary[600],
    fontWeight: 'bold',
  },
  paymentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  inputLabel: {
    ...textStyles.label,
    color: colors.neutral[700],
    marginRight: spacing[2],
  },
  paymentInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    ...textStyles.h5,
    textAlign: 'right',
  },
  exactButton: {
    marginLeft: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
  },
  exactButtonText: {
    ...textStyles.label,
    color: colors.primary[600],
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  quickAmountButton: {
    flex: 1,
    marginHorizontal: spacing[1],
    padding: spacing[2],
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  quickAmountText: {
    ...textStyles.label,
    color: colors.neutral[700],
  },
  modalButton: {
    marginTop: spacing[2],
  },
  discountTypeSelector: {
    flexDirection: 'row',
    marginBottom: spacing[4],
  },
  discountTypeButton: {
    flex: 1,
    padding: spacing[3],
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing[1],
  },
  discountTypeSelected: {
    backgroundColor: colors.primary[50],
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  discountTypeText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  discountTypeTextSelected: {
    color: colors.primary[600],
  },
  discountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  discountInput: {
    flex: 1,
    height: 56,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    ...textStyles.h4,
    textAlign: 'right',
  },
  discountSuffix: {
    ...textStyles.h5,
    color: colors.neutral[500],
    marginLeft: spacing[2],
  },
  receiptPreview: {
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  receiptSuccessIcon: {
    width: 64,
    height: 64,
    backgroundColor: colors.success[100],
    color: colors.success[600],
    fontSize: 32,
    lineHeight: 64,
    textAlign: 'center',
    borderRadius: 32,
    marginBottom: spacing[3],
  },
  receiptSuccessText: {
    ...textStyles.h5,
    color: colors.neutral[900],
    marginBottom: spacing[2],
  },
  receiptTotal: {
    ...textStyles.h2,
    color: colors.primary[600],
    marginBottom: spacing[4],
  },
  changeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  changeLabel: {
    ...textStyles.body,
    color: colors.neutral[600],
    marginRight: spacing[2],
  },
  changeAmount: {
    ...textStyles.h4,
    color: colors.success[600],
  },
  saleInfo: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  invoiceNumber: {
    ...textStyles.bodySm,
    color: colors.neutral[600],
  },
  pointsEarned: {
    ...textStyles.label,
    color: colors.primary[600],
    marginTop: spacing[1],
  },
  receiptActions: {
    width: '100%',
  },
  receiptButton: {
    marginBottom: spacing[2],
  },
  // Discount options (coupon/ticket buttons)
  discountOptionsRow: {
    flexDirection: 'row',
    marginBottom: spacing[4],
  },
  discountOptionButton: {
    flex: 1,
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing[1],
  },
  discountOptionDisabled: {
    opacity: 0.5,
  },
  discountOptionIcon: {
    fontSize: 32,
    marginBottom: spacing[1],
  },
  discountOptionText: {
    ...textStyles.label,
    color: colors.neutral[700],
  },
  discountDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  discountDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.neutral[200],
  },
  discountDividerText: {
    ...textStyles.caption,
    color: colors.neutral[400],
    marginHorizontal: spacing[2],
  },
  // Coupon modal styles
  couponCodeSection: {
    marginBottom: spacing[3],
  },
  couponCodeLabel: {
    ...textStyles.labelSm,
    color: colors.neutral[600],
    marginBottom: spacing[1],
  },
  couponCodeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  couponCodeInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    ...textStyles.body,
  },
  couponCodeButton: {
    marginLeft: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.lg,
  },
  couponCodeButtonText: {
    ...textStyles.label,
    color: colors.white,
  },
  couponList: {
    maxHeight: 300,
  },
  noCouponsText: {
    ...textStyles.body,
    color: colors.neutral[400],
    textAlign: 'center',
    paddingVertical: spacing[8],
  },
  couponItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[2],
  },
  couponItemLeft: {
    flex: 1,
  },
  couponItemName: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  couponItemDesc: {
    ...textStyles.bodySm,
    color: colors.primary[600],
    marginTop: spacing[0.5],
  },
  couponItemExpiry: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  couponItemArrow: {
    fontSize: 24,
    color: colors.neutral[400],
  },
  // Ticket modal styles
  ticketList: {
    maxHeight: 300,
  },
  noTicketsText: {
    ...textStyles.body,
    color: colors.neutral[400],
    textAlign: 'center',
    paddingVertical: spacing[8],
  },
  ticketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[2],
  },
  ticketItemDisabled: {
    opacity: 0.5,
  },
  ticketItemLeft: {
    flex: 1,
  },
  ticketItemName: {
    ...textStyles.label,
    color: colors.neutral[900],
  },
  ticketItemRemaining: {
    ...textStyles.bodySm,
    color: colors.primary[600],
    marginTop: spacing[0.5],
  },
  ticketItemExpiry: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  ticketItemArrow: {
    fontSize: 24,
    color: colors.neutral[400],
  },
  ticketItemHint: {
    ...textStyles.caption,
    color: colors.neutral[400],
  },
});
