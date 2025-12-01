# Beauty POS API リファレンス

`@beauty-pos/api` パッケージが提供するAPIサービスの一覧と主要メソッドです。

---

## 認証 (authService)

```typescript
import { authService } from '@beauty-pos/api';

// サインアップ
await authService.signUp({ email, password, firstName, lastName, companyName });

// サインイン
await authService.signIn({ email, password });

// サインアウト
await authService.signOut();

// 現在のユーザー取得
const user = await authService.getCurrentUser();

// パスワードリセット
await authService.resetPassword(email);
```

---

## 予約管理 (reservationService)

```typescript
import { reservationService } from '@beauty-pos/api';

// 予約一覧取得
const reservations = await reservationService.getByDate(storeId, date);
const reservations = await reservationService.getByDateRange(storeId, startDate, endDate);

// 予約詳細取得
const reservation = await reservationService.getById(reservationId);

// 予約作成
const reservation = await reservationService.create({
  company_id,
  store_id,
  customer_id,
  staff_id,
  start_time,
  end_time,
  status: 'booked',
  menu_ids: ['menu1', 'menu2'],
});

// 予約更新
await reservationService.update(reservationId, { status: 'confirmed' });

// 予約キャンセル
await reservationService.cancel(reservationId, reason);

// 空き枠取得
const slots = await reservationService.getAvailableSlots(storeId, staffId, date);

// 次回予約取得
const upcoming = await reservationService.getUpcoming(storeId, limit);
```

---

## 来店管理 (visitService)

```typescript
import { visitService } from '@beauty-pos/api';

// 来店一覧取得
const visits = await visitService.getByDate(storeId, date);
const visits = await visitService.getByCustomer(customerId);

// 来店詳細取得
const visit = await visitService.getById(visitId);

// 来店登録（チェックイン）
const visit = await visitService.checkIn({
  company_id,
  store_id,
  customer_id,
  reservation_id, // オプション
  staff_id,
});

// 施術開始
await visitService.startService(visitId);

// 施術完了（チェックアウト）
await visitService.checkOut(visitId);

// 本日の来店数
const count = await visitService.getTodayCount(storeId);
```

---

## 売上管理 (saleService)

```typescript
import { saleService } from '@beauty-pos/api';

// 売上作成
const sale = await saleService.create({
  company_id,
  store_id,
  customer_id,
  visit_id,
  items: [
    { menu_id, quantity, unit_price, staff_assignments: [...] },
    { product_id, quantity, unit_price },
  ],
  payments: [
    { method: 'cash', amount: 5000 },
    { method: 'credit_card', amount: 3000 },
  ],
  discounts: [
    { type: 'manual', value: 500, is_percentage: false },
  ],
  points_used: 100,
  points_earned: 80,
});

// 売上取得
const sale = await saleService.getById(saleId);
const sales = await saleService.getByCustomer(customerId);
const sales = await saleService.getByDateRange(storeId, startDate, endDate);

// 日次売上サマリー
const summary = await saleService.getDailySales(storeId, date);
const total = await saleService.getSalesTotal(storeId, startDate, endDate);

// 返金（赤伝票）
await saleService.refund(saleId, reason, staffId);
```

---

## 顧客管理 (customerService)

```typescript
import { customerService } from '@beauty-pos/api';

// 顧客一覧取得
const customers = await customerService.getAll(companyId, { limit, offset });

// 顧客検索
const customers = await customerService.search(companyId, {
  query: '田中',
  tags: ['VIP'],
});

// 顧客詳細取得
const customer = await customerService.getById(customerId);

// 顧客作成
const customer = await customerService.create({
  company_id,
  first_name,
  last_name,
  phone,
  email,
});

// 顧客更新
await customerService.update(customerId, { phone: '090-xxxx-xxxx' });

// カルテ更新
await customerService.updateKarte(customerId, {
  hair_type: { amount: 'thick', hardness: 'soft' },
});

// カラーレシピ追加
await customerService.addColorRecipe(customerId, {
  date,
  formula,
  developer,
  processing_time,
  notes,
});

// タグ管理
await customerService.addTag(customerId, tagId);
await customerService.removeTag(customerId, tagId);
```

---

## メニュー管理 (menuService)

```typescript
import { menuService } from '@beauty-pos/api';

// メニュー一覧
const menus = await menuService.getAll(companyId);
const menus = await menuService.getActive(companyId);
const menus = await menuService.getByCategory(companyId, categoryId);

// メニュー詳細
const menu = await menuService.getById(menuId);

// メニュー作成
const menu = await menuService.create({
  company_id,
  category_id,
  name,
  price,
  duration_minutes,
  description,
});

// メニュー更新
await menuService.update(menuId, { price: 5500 });

// メニュー削除（論理削除）
await menuService.delete(menuId);

// カテゴリ管理
const categories = await menuService.getCategories(companyId);
await menuService.createCategory(companyId, { name, display_order });
```

---

## 商品管理 (productService)

```typescript
import { productService } from '@beauty-pos/api';

// 商品一覧
const products = await productService.getAll(companyId);
const products = await productService.getActive(companyId);

// 商品詳細
const product = await productService.getById(productId);

// 商品作成
const product = await productService.create({
  company_id,
  name,
  price,
  cost,
  stock_quantity,
  reorder_point,
});

// 商品更新
await productService.update(productId, { price: 2500 });

// 在庫調整
await productService.adjustStock(productId, quantity, reason);

// 低在庫商品取得
const lowStock = await productService.getLowStock(companyId);
```

---

## スタッフ管理 (staffService)

```typescript
import { staffService } from '@beauty-pos/api';

// スタッフ一覧
const staff = await staffService.getAll(companyId);
const staff = await staffService.getByStore(storeId);

// スタッフ詳細
const staff = await staffService.getById(staffId);

// スタッフ作成
const staff = await staffService.create({
  company_id,
  first_name,
  last_name,
  email,
  role: 'stylist',
});

// スタッフ更新
await staffService.update(staffId, { role: 'manager' });

// 店舗割り当て
await staffService.assignToStore(staffId, storeId);
await staffService.removeFromStore(staffId, storeId);
```

---

## シフト・勤怠管理 (shiftService, attendanceService)

```typescript
import { shiftService, attendanceService } from '@beauty-pos/api';

// シフト取得
const shifts = await shiftService.getByDateRange(storeId, startDate, endDate);
const shifts = await shiftService.getByStaff(staffId, startDate, endDate);

// シフト作成
await shiftService.create({
  store_id,
  staff_id,
  date,
  start_time,
  end_time,
});

// シフト更新
await shiftService.update(shiftId, { start_time: '10:00' });

// 前週コピー
await shiftService.copyWeek(storeId, sourceWeekStart, targetWeekStart);

// 勤怠取得
const attendance = await attendanceService.getTodayByStore(storeId);

// 打刻
await attendanceService.clockIn(staffId, storeId);
await attendanceService.clockOut(staffId);
await attendanceService.startBreak(staffId);
await attendanceService.endBreak(staffId);
```

---

## ポイント管理 (pointService)

```typescript
import { pointService } from '@beauty-pos/api';

// ポイント残高
const balance = await pointService.getBalance(customerId);

// ポイント履歴
const transactions = await pointService.getTransactions(customerId);

// ポイント付与
await pointService.addPoints(customerId, {
  amount: 100,
  type: 'earned',
  sale_id,
});

// ポイント使用
await pointService.usePoints(customerId, {
  amount: 500,
  sale_id,
});

// ポイント設定取得
const settings = await pointService.getSettings(companyId);
```

---

## クーポン管理 (couponService)

```typescript
import { couponService } from '@beauty-pos/api';

// クーポン一覧
const coupons = await couponService.getAll(companyId);
const coupons = await couponService.getActive(companyId);

// クーポン作成
const coupon = await couponService.create({
  company_id,
  code: 'SUMMER2025',
  discount_type: 'percentage',
  discount_value: 10,
  valid_from,
  valid_until,
  max_uses: 100,
});

// コード検証
const result = await couponService.validateCode(companyId, code);

// クーポン使用
await couponService.use(couponId, customerId, saleId);
```

---

## 回数券管理 (ticketService)

```typescript
import { ticketService } from '@beauty-pos/api';

// 回数券一覧
const tickets = await ticketService.getAll(companyId);

// 顧客の回数券
const tickets = await ticketService.getCustomerTickets(customerId);

// 回数券作成
const ticket = await ticketService.create({
  company_id,
  name: 'カット回数券（5回）',
  total_uses: 5,
  price: 20000,
  menu_ids: ['cut-menu-id'],
});

// 顧客に付与
await ticketService.assignToCustomer(ticketId, customerId, { valid_until });

// 回数券使用
await ticketService.use(customerTicketId, saleId);
```

---

## 通知管理 (notificationService)

```typescript
import { notificationService, notificationPreferenceService } from '@beauty-pos/api';

// 通知送信
await notificationService.send({
  company_id,
  customer_id,
  type: 'reservation_reminder',
  channel: 'line',
  data: { reservation_id },
});

// 通知テンプレート取得
const templates = await notificationService.getTemplates(companyId);

// 通知設定取得・更新
const prefs = await notificationPreferenceService.get(companyId);
await notificationPreferenceService.update(companyId, {
  reminder: { enabled: true, timing_hours: 24, channels: ['line', 'email'] },
});
```

---

## LINE通知 (lineService)

```typescript
import { lineService } from '@beauty-pos/api';

// メッセージ送信
await lineService.sendMessage(companyId, {
  to: lineUserId,
  messages: [{ type: 'text', text: 'ご予約ありがとうございます' }],
});

// 予約リマインダー送信
await lineService.sendReservationReminder(companyId, reservation);

// 予約確認送信
await lineService.sendReservationConfirmation(companyId, reservation);
```

---

## SaaS課金 (subscriptionService)

```typescript
import { subscriptionService } from '@beauty-pos/api';

// プラン一覧
const plans = subscriptionService.getPlans();
const plan = subscriptionService.getPlan('professional');

// サブスクリプション取得
const subscription = await subscriptionService.getSubscription(companyId);

// チェックアウトセッション作成
const { url } = await subscriptionService.createCheckoutSession(
  companyId,
  'professional',
  'monthly'
);

// プラン変更
await subscriptionService.changePlan(companyId, 'enterprise', 'yearly');

// キャンセル
await subscriptionService.cancelSubscription(companyId, false);

// プラン制限チェック
const limits = await subscriptionService.checkPlanLimits(companyId);
const available = await subscriptionService.isFeatureAvailable(companyId, 'aiFeatures');

// 請求書取得
const invoices = await subscriptionService.getInvoices(companyId);

// 支払い方法
const methods = await subscriptionService.getPaymentMethods(companyId);
await subscriptionService.addPaymentMethod(companyId, paymentMethodId);
await subscriptionService.setDefaultPaymentMethod(companyId, paymentMethodId);
```

---

## 機能設定 (featureSettingsService)

```typescript
import { featureSettingsService } from '@beauty-pos/api';

// 機能設定取得
const settings = await featureSettingsService.getAll(companyId);

// 機能有効化/無効化
await featureSettingsService.setEnabled(companyId, 'ai_simulation', true);

// 機能定義取得
const features = featureSettingsService.getFeatureDefinitions();
const categories = featureSettingsService.getCategories();
```

---

## 外部連携設定 (integrationSettingsService)

```typescript
import { integrationSettingsService } from '@beauty-pos/api';

// 連携設定取得
const settings = await integrationSettingsService.getAll(companyId);

// 連携有効化
await integrationSettingsService.setEnabled(companyId, 'line', true);

// 連携設定更新
await integrationSettingsService.updateConfig(companyId, 'line', {
  channel_id: 'xxx',
  channel_secret: 'yyy',
});

// 連携テスト
const result = await integrationSettingsService.testConnection(companyId, 'line');
```

---

## 型定義

主要な型は各サービスからエクスポートされています：

```typescript
import type {
  // 認証
  AuthUser, SignUpData, SignInData,

  // 予約
  Reservation, ReservationInsert, ReservationUpdate, ReservationWithDetails,

  // 来店
  Visit, VisitInsert, VisitUpdate, VisitWithDetails,

  // 売上
  Sale, SaleItem, SalePayment, SaleDiscount, SaleWithDetails, CreateSaleData,

  // 顧客
  Customer, CustomerInsert, CustomerUpdate, CustomerWithDetails,

  // メニュー
  Menu, MenuCategory, MenuWithDetails,

  // 商品
  Product, ProductInsert, ProductUpdate,

  // スタッフ
  Staff, StaffInsert, StaffUpdate, StaffWithStores,

  // シフト・勤怠
  Shift, ShiftInsert, Attendance, AttendanceInsert,

  // ポイント
  PointTransaction, PointSettings,

  // クーポン・回数券
  Coupon, CouponUsage, Ticket, TicketUsage,

  // 通知
  Notification, NotificationTemplate, NotificationPreference,

  // サブスクリプション
  SubscriptionPlan, Subscription, Invoice, PaymentMethod,

  // 設定
  FeatureType, FeatureConfig, IntegrationType, IntegrationConfig,
} from '@beauty-pos/api';
```
