export type CouponType = 'percentage' | 'amount';

export interface Coupon {
  id: string;
  companyId: string;
  name: string;
  code?: string;
  type: CouponType;
  value: number;
  maxDiscount?: number;
  minPurchase?: number;
  applicableMenuTagIds: string[];
  applicableMenuIds: string[];
  usageLimit?: number;
  usageCount: number;
  perCustomerLimit?: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CouponUsage {
  id: string;
  couponId: string;
  customerId: string;
  saleId: string;
  discountAmount: number;
  usedAt: string;
  createdAt: string;
}

export interface CreateCouponInput {
  companyId: string;
  name: string;
  code?: string;
  type: CouponType;
  value: number;
  maxDiscount?: number;
  minPurchase?: number;
  applicableMenuTagIds?: string[];
  applicableMenuIds?: string[];
  usageLimit?: number;
  perCustomerLimit?: number;
  validFrom?: string;
  validUntil?: string;
}

export interface UpdateCouponInput extends Partial<Omit<CreateCouponInput, 'companyId'>> {
  isActive?: boolean;
}

export interface PointTransaction {
  id: string;
  companyId: string;
  customerId: string;
  saleId?: string;
  type: 'earn' | 'use' | 'expire' | 'adjust';
  points: number;
  balanceAfter: number;
  description?: string;
  expiresAt?: string;
  createdAt: string;
}

export function calculateCouponDiscount(
  coupon: Coupon,
  subtotal: number,
  applicableAmount: number
): number {
  if (!coupon.isActive) return 0;
  if (coupon.validFrom && new Date(coupon.validFrom) > new Date()) return 0;
  if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) return 0;
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return 0;
  if (coupon.minPurchase && subtotal < coupon.minPurchase) return 0;

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = Math.floor(applicableAmount * coupon.value / 100);
  } else {
    discount = coupon.value;
  }

  if (coupon.maxDiscount) {
    discount = Math.min(discount, coupon.maxDiscount);
  }

  return discount;
}
