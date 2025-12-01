/**
 * 販売アイテムサービス（回数券・クーポン・メニュー・商品）の統合テスト
 */

import { ticketService } from '../../services/ticketService';
import { couponService } from '../../services/couponService';
import { menuService } from '../../services/menuService';
import { productService } from '../../services/productService';
import { getSupabaseClient, resetSupabaseClient } from '../../client';
import { createMockQueryBuilder } from '../setup';

// Mock Supabase client
jest.mock('../../client', () => ({
  getSupabaseClient: jest.fn(),
  resetSupabaseClient: jest.fn(),
}));

const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn(),
};

// Test data
const testData = {
  companyId: 'company-001',
  storeId: 'store-001',
  customerId: 'customer-001',
  ticketId: 'ticket-001',
  couponId: 'coupon-001',
  menuId: 'menu-001',
  productId: 'product-001',
};

// =================================
// ticketService Tests
// =================================
describe('ticketService: 回数券サービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getById', () => {
    it('回数券を取得できる', async () => {
      const ticket = {
        id: testData.ticketId,
        customer_id: testData.customerId,
        ticket_type: 'count',
        total_uses: 10,
        remaining_uses: 7,
        valid_until: '2024-12-31T23:59:59Z',
        status: 'active',
      };

      const queryBuilder = createMockQueryBuilder([ticket]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: ticket, error: null });
          return Promise.resolve({ data: ticket, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await ticketService.getById(testData.ticketId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tickets');
    });
  });

  describe('getByCustomer', () => {
    it('顧客の回数券一覧を取得できる', async () => {
      const tickets = [
        { id: 'ticket-001', total_uses: 10, remaining_uses: 7, status: 'active' },
        { id: 'ticket-002', total_uses: 5, remaining_uses: 3, status: 'active' },
      ];

      const queryBuilder = createMockQueryBuilder(tickets);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await ticketService.getByCustomer(testData.customerId);

      expect(result).toHaveLength(2);
    });
  });

  describe('getActive', () => {
    it('有効な回数券を取得できる', async () => {
      const activeTickets = [
        { id: 'ticket-001', remaining_uses: 7, status: 'active' },
      ];

      const queryBuilder = createMockQueryBuilder(activeTickets);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await ticketService.getActive(testData.companyId);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('active');
    });
  });

  describe('create', () => {
    it('回数券を購入できる', async () => {
      const newTicket = {
        id: 'ticket-003',
        company_id: testData.companyId,
        customer_id: testData.customerId,
        name: 'カット回数券',
        ticket_type: 'count',
        total_uses: 10,
        remaining_uses: 10,
        total_amount: 35000,
        status: 'active',
      };

      const queryBuilder = createMockQueryBuilder([newTicket]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: newTicket, error: null });
          return Promise.resolve({ data: newTicket, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await ticketService.create({
        company_id: testData.companyId,
        customer_id: testData.customerId,
        name: 'カット回数券',
        ticket_type: 'count',
        total_uses: 10,
        remaining_uses: 10,
        total_amount: 35000,
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tickets');
    });
  });

  describe('use', () => {
    it('回数券を使用できる', async () => {
      const ticket = {
        id: testData.ticketId,
        remaining_uses: 7,
        status: 'active',
        ticket_type: 'count',
      };
      const usage = {
        id: 'usage-001',
        ticket_id: testData.ticketId,
        sale_id: 'sale-001',
      };

      const getQueryBuilder = createMockQueryBuilder([ticket]);
      getQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: ticket, error: null });
          return Promise.resolve({ data: ticket, error: null });
        },
      });

      const insertQueryBuilder = createMockQueryBuilder([usage]);
      insertQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: usage, error: null });
          return Promise.resolve({ data: usage, error: null });
        },
      });

      const updateQueryBuilder = createMockQueryBuilder([]);

      mockSupabaseClient.from
        .mockReturnValueOnce(getQueryBuilder)
        .mockReturnValueOnce(insertQueryBuilder)
        .mockReturnValueOnce(updateQueryBuilder);

      const result = await ticketService.use(testData.ticketId, 'sale-001');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tickets');
    });
  });

  describe('cancel', () => {
    it('回数券をキャンセルできる', async () => {
      const cancelledTicket = { id: testData.ticketId, status: 'cancelled' };

      const queryBuilder = createMockQueryBuilder([cancelledTicket]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: cancelledTicket, error: null });
          return Promise.resolve({ data: cancelledTicket, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await ticketService.cancel(testData.ticketId);

      expect(result.status).toBe('cancelled');
    });
  });

  describe('getExpiring', () => {
    it('期限が近い回数券を取得できる', async () => {
      const expiringTickets = [
        { id: 'ticket-001', valid_until: '2024-02-01T23:59:59Z' },
      ];

      const queryBuilder = createMockQueryBuilder(expiringTickets);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await ticketService.getExpiring(testData.companyId, 30);

      expect(result).toHaveLength(1);
    });
  });
});

// =================================
// couponService Tests
// =================================
describe('couponService: クーポンサービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getAll', () => {
    it('全クーポンを取得できる', async () => {
      const coupons = [
        { id: 'coupon-001', code: 'SAVE10', discount_type: 'percentage', discount_value: 10 },
        { id: 'coupon-002', code: 'SAVE500', discount_type: 'fixed', discount_value: 500 },
      ];

      const queryBuilder = createMockQueryBuilder(coupons);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await couponService.getAll(testData.companyId);

      expect(result).toHaveLength(2);
    });
  });

  describe('getActive', () => {
    it('有効なクーポンのみを取得できる', async () => {
      const activeCoupons = [
        { id: 'coupon-001', code: 'SAVE10', is_active: true },
      ];

      const queryBuilder = createMockQueryBuilder(activeCoupons);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await couponService.getActive(testData.companyId);

      expect(result).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('クーポン詳細を取得できる', async () => {
      const coupon = {
        id: testData.couponId,
        code: 'SAVE10',
        discount_type: 'percentage',
        discount_value: 10,
        min_purchase_amount: 3000,
      };

      const queryBuilder = createMockQueryBuilder([coupon]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: coupon, error: null });
          return Promise.resolve({ data: coupon, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await couponService.getById(testData.couponId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('coupons');
    });
  });

  describe('getByCode', () => {
    it('コードでクーポンを検索できる', async () => {
      const coupon = {
        id: testData.couponId,
        code: 'SAVE10',
        discount_type: 'percentage',
        discount_value: 10,
      };

      const queryBuilder = createMockQueryBuilder([coupon]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: coupon, error: null });
          return Promise.resolve({ data: coupon, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await couponService.getByCode(testData.companyId, 'SAVE10');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('coupons');
    });
  });

  describe('create', () => {
    it('クーポンを作成できる', async () => {
      const newCoupon = {
        id: 'coupon-003',
        company_id: testData.companyId,
        code: 'NEW20',
        name: '新規割引クーポン',
        discount_type: 'percentage',
        discount_value: 20,
      };

      const queryBuilder = createMockQueryBuilder([newCoupon]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: newCoupon, error: null });
          return Promise.resolve({ data: newCoupon, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await couponService.create({
        company_id: testData.companyId,
        code: 'NEW20',
        name: '新規割引クーポン',
        discount_type: 'percentage',
        discount_value: 20,
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('coupons');
    });
  });

  describe('validate', () => {
    it('クーポンの有効性をチェックできる', async () => {
      const coupon = {
        id: testData.couponId,
        is_active: true,
        valid_from: '2024-01-01T00:00:00Z',
        valid_until: '2024-12-31T23:59:59Z',
        max_uses: 100,
        used_count: 50,
      };

      const queryBuilder = createMockQueryBuilder([coupon]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: coupon, error: null });
          return Promise.resolve({ data: coupon, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await couponService.validate(testData.companyId, 'SAVE10', testData.customerId);

      expect(result).toHaveProperty('valid');
    });
  });

  describe('calculateDiscount', () => {
    it('割引額を計算できる', async () => {
      const coupon = {
        id: testData.couponId,
        discount_type: 'percentage',
        discount_value: 10,
        max_discount_amount: 1000,
      };

      // calculateDiscount is a sync function that takes a coupon object
      const discount = await couponService.calculateDiscount(coupon as any, 5000);

      expect(typeof discount).toBe('number');
      expect(discount).toBe(500); // 10% of 5000
    });
  });

  describe('use', () => {
    it('クーポンを使用できる', async () => {
      const usage = {
        id: 'usage-001',
        coupon_id: testData.couponId,
        customer_id: testData.customerId,
        sale_id: 'sale-001',
        discount_amount: 500,
      };

      const usageQueryBuilder = createMockQueryBuilder([usage]);
      usageQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: usage, error: null });
          return Promise.resolve({ data: usage, error: null });
        },
      });

      const couponQueryBuilder = createMockQueryBuilder([{ used_count: 5 }]);
      couponQueryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: { used_count: 5 }, error: null });
          return Promise.resolve({ data: { used_count: 5 }, error: null });
        },
      });

      const updateQueryBuilder = createMockQueryBuilder([]);

      mockSupabaseClient.from
        .mockReturnValueOnce(usageQueryBuilder)
        .mockReturnValueOnce(couponQueryBuilder)
        .mockReturnValueOnce(updateQueryBuilder);

      const result = await couponService.use(testData.couponId, testData.customerId, 'sale-001', 500);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('coupon_usages');
    });
  });

  describe('generateCode', () => {
    it('ユニークなクーポンコードを生成できる', async () => {
      const code = await couponService.generateCode();

      expect(typeof code).toBe('string');
      expect(code.length).toBe(8);
    });
  });
});

// =================================
// menuService Tests
// =================================
describe('menuService: メニューサービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getCategories', () => {
    it('メニューカテゴリを取得できる', async () => {
      const categories = [
        { id: 'cat-001', name: 'カット', sort_order: 1 },
        { id: 'cat-002', name: 'カラー', sort_order: 2 },
      ];

      const queryBuilder = createMockQueryBuilder(categories);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await menuService.getCategories(testData.companyId);

      expect(result).toHaveLength(2);
    });
  });

  describe('createCategory', () => {
    it('メニューカテゴリを作成できる', async () => {
      const newCategory = {
        id: 'cat-003',
        company_id: testData.companyId,
        name: 'パーマ',
        sort_order: 3,
      };

      const queryBuilder = createMockQueryBuilder([newCategory]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: newCategory, error: null });
          return Promise.resolve({ data: newCategory, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await menuService.createCategory({
        company_id: testData.companyId,
        name: 'パーマ',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('menu_categories');
    });
  });

  describe('getAll', () => {
    it('全メニューを取得できる', async () => {
      const menus = [
        { id: 'menu-001', name: 'カット', base_price: 4000 },
        { id: 'menu-002', name: 'カラー', base_price: 6000 },
      ];

      const queryBuilder = createMockQueryBuilder(menus);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await menuService.getAll(testData.companyId);

      expect(result).toHaveLength(2);
    });
  });

  describe('getActive', () => {
    it('有効なメニューのみを取得できる', async () => {
      const activeMenus = [
        { id: 'menu-001', name: 'カット', base_price: 4000, is_active: true },
      ];

      const queryBuilder = createMockQueryBuilder(activeMenus);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await menuService.getActive(testData.companyId);

      expect(result).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('メニュー詳細を取得できる', async () => {
      const menu = {
        id: testData.menuId,
        name: 'カット',
        description: 'カット施術',
        base_price: 4000,
        duration_minutes: 60,
      };

      const queryBuilder = createMockQueryBuilder([menu]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: menu, error: null });
          return Promise.resolve({ data: menu, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await menuService.getById(testData.menuId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('menus');
    });
  });

  describe('getByCategory', () => {
    it('カテゴリ別にメニューを取得できる', async () => {
      const menus = [
        { id: 'menu-001', name: 'カット', category_id: 'cat-001' },
      ];

      const queryBuilder = createMockQueryBuilder(menus);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await menuService.getByCategory('cat-001');

      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('メニューを作成できる', async () => {
      const newMenu = {
        id: 'menu-003',
        company_id: testData.companyId,
        code: 'MENU-003',
        name: 'トリートメント',
        base_price: 3000,
      };

      const queryBuilder = createMockQueryBuilder([newMenu]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: newMenu, error: null });
          return Promise.resolve({ data: newMenu, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await menuService.create({
        company_id: testData.companyId,
        code: 'MENU-003',
        name: 'トリートメント',
        base_price: 3000,
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('menus');
    });
  });

  describe('update', () => {
    it('メニューを更新できる', async () => {
      const updatedMenu = {
        id: testData.menuId,
        name: 'カット',
        base_price: 4500,
      };

      const queryBuilder = createMockQueryBuilder([updatedMenu]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: updatedMenu, error: null });
          return Promise.resolve({ data: updatedMenu, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await menuService.update(testData.menuId, { base_price: 4500 });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('menus');
    });
  });

  describe('delete', () => {
    it('メニューを論理削除できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(menuService.delete(testData.menuId)).resolves.not.toThrow();
    });
  });

  describe('getProcesses', () => {
    it('施術工程を取得できる', async () => {
      const processes = [
        { id: 'proc-001', name: 'シャンプー', duration_minutes: 10 },
        { id: 'proc-002', name: 'カット', duration_minutes: 40 },
      ];

      const queryBuilder = createMockQueryBuilder(processes);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await menuService.getProcesses(testData.companyId);

      expect(result).toHaveLength(2);
    });
  });

  describe('generateMenuCode', () => {
    it('メニューコードを生成できる', async () => {
      const menus = [{ code: 'MENU-005' }];
      const queryBuilder = createMockQueryBuilder(menus);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: { code: 'MENU-005' }, error: null });
          return Promise.resolve({ data: { code: 'MENU-005' }, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const code = await menuService.generateMenuCode(testData.companyId);

      expect(typeof code).toBe('string');
    });
  });
});

// =================================
// productService Tests
// =================================
describe('productService: 商品サービス', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getAll', () => {
    it('全商品を取得できる', async () => {
      const products = [
        { id: 'prod-001', name: 'シャンプー', price: 2500, stock_quantity: 10 },
        { id: 'prod-002', name: 'トリートメント', price: 3000, stock_quantity: 8 },
      ];

      const queryBuilder = createMockQueryBuilder(products);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await productService.getAll(testData.companyId, testData.storeId);

      expect(result).toHaveLength(2);
    });
  });

  describe('getActive', () => {
    it('有効な商品のみを取得できる', async () => {
      const activeProducts = [
        { id: 'prod-001', name: 'シャンプー', is_active: true },
      ];

      const queryBuilder = createMockQueryBuilder(activeProducts);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await productService.getActive(testData.companyId, testData.storeId);

      expect(result).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('商品詳細を取得できる', async () => {
      const product = {
        id: testData.productId,
        name: 'シャンプー',
        description: '高級シャンプー',
        price: 2500,
        cost: 1000,
        stock_quantity: 10,
        barcode: '4901234567890',
      };

      const queryBuilder = createMockQueryBuilder([product]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: product, error: null });
          return Promise.resolve({ data: product, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await productService.getById(testData.productId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products');
    });
  });

  describe('getByBarcode', () => {
    it('バーコードで商品を検索できる', async () => {
      const product = {
        id: testData.productId,
        name: 'シャンプー',
        barcode: '4901234567890',
      };

      const queryBuilder = createMockQueryBuilder([product]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: product, error: null });
          return Promise.resolve({ data: product, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await productService.getByBarcode('4901234567890', testData.companyId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products');
    });
  });

  describe('getByCategory', () => {
    it('カテゴリ別に商品を取得できる', async () => {
      const products = [
        { id: 'prod-001', name: 'シャンプー', category: 'haircare' },
      ];

      const queryBuilder = createMockQueryBuilder(products);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await productService.getByCategory(testData.companyId, testData.storeId, 'haircare');

      expect(result).toHaveLength(1);
    });
  });

  describe('getLowStock', () => {
    it('在庫不足の商品を取得できる', async () => {
      const lowStockProducts = [
        { id: 'prod-001', name: 'シャンプー', stock_quantity: 2, min_stock_quantity: 5 },
      ];

      const queryBuilder = createMockQueryBuilder(lowStockProducts);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await productService.getLowStock(testData.companyId, testData.storeId);

      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('商品を作成できる', async () => {
      const newProduct = {
        id: 'prod-003',
        company_id: testData.companyId,
        store_id: testData.storeId,
        name: 'ヘアオイル',
        selling_price: 1500,
      };

      const queryBuilder = createMockQueryBuilder([newProduct]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: newProduct, error: null });
          return Promise.resolve({ data: newProduct, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await productService.create({
        company_id: testData.companyId,
        category: 'hair_care',
        code: 'PROD-003',
        name: 'ヘアオイル',
        selling_price: 1500,
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products');
    });
  });

  describe('update', () => {
    it('商品を更新できる', async () => {
      const updatedProduct = {
        id: testData.productId,
        name: 'シャンプー',
        selling_price: 2800,
      };

      const queryBuilder = createMockQueryBuilder([updatedProduct]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: updatedProduct, error: null });
          return Promise.resolve({ data: updatedProduct, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await productService.update(testData.productId, { selling_price: 2800 });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products');
    });
  });

  describe('delete', () => {
    it('商品を論理削除できる', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await expect(productService.delete(testData.productId)).resolves.not.toThrow();
    });
  });

  describe('adjustStock', () => {
    it('在庫を調整できる', async () => {
      const product = {
        id: testData.productId,
        stock_quantity: 15,
      };

      const queryBuilder = createMockQueryBuilder([product]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: product, error: null });
          return Promise.resolve({ data: product, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await productService.adjustStock(
        testData.productId,
        5,
        '入荷'
      );

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products');
    });
  });

  describe('search', () => {
    it('商品を検索できる', async () => {
      const products = [
        { id: 'prod-001', name: 'シャンプー', selling_price: 2500 },
      ];

      const queryBuilder = createMockQueryBuilder(products);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await productService.search(testData.companyId, testData.storeId, 'シャンプー');

      expect(result).toHaveLength(1);
    });
  });

  describe('getCategories', () => {
    it('商品カテゴリを取得できる', async () => {
      const products = [
        { category: 'ヘアケア' },
        { category: 'スタイリング' },
        { category: 'ヘアケア' }, // duplicate to test unique filtering
      ];

      const queryBuilder = createMockQueryBuilder(products);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await productService.getCategories(testData.companyId);

      expect(result).toHaveLength(2);
    });
  });
});
