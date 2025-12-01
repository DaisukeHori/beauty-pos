# 美容室向け高度分析POSシステム 詳細設計書

**バージョン**: 1.0
**作成日**: 2025-11-30
**プロジェクト名**: Beauty POS

---

## 1. コンポーネント設計

### 1.1 共通コンポーネント

#### 1.1.1 UIコンポーネント一覧

| コンポーネント | 説明 | Props |
|---------------|------|-------|
| Button | ボタン | variant, size, disabled, loading, onPress |
| Input | テキスト入力 | type, placeholder, value, onChange, error |
| Select | セレクトボックス | options, value, onChange, multiple |
| DatePicker | 日付選択 | value, onChange, minDate, maxDate |
| TimePicker | 時間選択 | value, onChange, interval |
| Modal | モーダル | visible, onClose, title, children |
| Card | カード | title, children, actions |
| Avatar | アバター画像 | src, size, name |
| Badge | バッジ | count, color |
| Tag | タグ表示 | label, color, onRemove |
| TagInput | タグ入力 | tags, onAdd, onRemove, suggestions |
| SearchBar | 検索バー | value, onChange, onSearch, placeholder |
| TabBar | タブ | tabs, activeTab, onChange |
| Table | テーブル | columns, data, sortable, pagination |
| List | リスト | data, renderItem, onEndReached |
| Calendar | カレンダー | events, onDateSelect, onEventClick |
| Chart | チャート | type, data, options |
| Toast | トースト通知 | message, type, duration |
| Loading | ローディング | size, color |
| Empty | 空状態表示 | icon, message, action |

#### 1.1.2 レイアウトコンポーネント

| コンポーネント | 説明 |
|---------------|------|
| Screen | 画面コンテナ |
| Header | ヘッダー |
| Sidebar | サイドバー |
| Footer | フッター |
| Container | コンテンツコンテナ |
| Row | 横並びレイアウト |
| Column | 縦並びレイアウト |
| Grid | グリッドレイアウト |
| Divider | 区切り線 |
| Spacer | スペーサー |

### 1.2 ドメイン固有コンポーネント

#### 1.2.1 顧客関連

```typescript
// CustomerCard - 顧客カード
interface CustomerCardProps {
  customer: Customer;
  onPress: () => void;
  showLastVisit?: boolean;
  showTags?: boolean;
}

// CustomerForm - 顧客登録/編集フォーム
interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: CustomerFormData) => void;
  onCancel: () => void;
}

// CustomerKarte - 顧客カルテ
interface CustomerKarteProps {
  customerId: string;
  editable?: boolean;
}

// HairConditionForm - 髪質記録フォーム
interface HairConditionFormProps {
  customerId: string;
  onSave: (data: HairCondition) => void;
}

// VisitHistory - 来店履歴
interface VisitHistoryProps {
  customerId: string;
  limit?: number;
}

// PhotoGallery - 施術写真ギャラリー
interface PhotoGalleryProps {
  customerId: string;
  editable?: boolean;
}
```

#### 1.2.2 予約関連

```typescript
// ReservationCalendar - 予約カレンダー
interface ReservationCalendarProps {
  storeId: string;
  staffId?: string;
  onSlotSelect: (slot: TimeSlot) => void;
  onReservationClick: (reservation: Reservation) => void;
}

// ReservationForm - 予約作成/編集フォーム
interface ReservationFormProps {
  reservation?: Reservation;
  customerId?: string;
  onSubmit: (data: ReservationFormData) => void;
  onCancel: () => void;
}

// ReservationCard - 予約カード
interface ReservationCardProps {
  reservation: Reservation;
  onPress: () => void;
  showCustomer?: boolean;
  showStaff?: boolean;
}

// TimeSlotPicker - 時間枠選択
interface TimeSlotPickerProps {
  date: Date;
  staffId: string;
  duration: number;
  onSelect: (slot: TimeSlot) => void;
}

// StaffSelector - スタッフ選択
interface StaffSelectorProps {
  storeId: string;
  value: string;
  onChange: (staffId: string) => void;
  showAvailability?: boolean;
  date?: Date;
}
```

#### 1.2.3 会計関連

```typescript
// POSScreen - POSメイン画面
interface POSScreenProps {
  visitId: string;
}

// MenuSelector - メニュー選択
interface MenuSelectorProps {
  storeId: string;
  onSelect: (menu: Menu) => void;
  selectedMenus: SelectedMenu[];
}

// CartItem - カート項目
interface CartItemProps {
  item: SaleItem;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  onStaffAssign: (staffAssignment: StaffAssignment) => void;
}

// StaffAssignmentModal - 担当者割り当てモーダル
interface StaffAssignmentModalProps {
  visible: boolean;
  saleItem: SaleItem;
  onSave: (assignment: StaffAssignment) => void;
  onClose: () => void;
}

// PaymentSelector - 支払い方法選択
interface PaymentSelectorProps {
  total: number;
  onPaymentAdd: (payment: Payment) => void;
  payments: Payment[];
}

// DiscountModal - 割引モーダル
interface DiscountModalProps {
  visible: boolean;
  onApply: (discount: Discount) => void;
  onClose: () => void;
}

// ReceiptPreview - レシートプレビュー
interface ReceiptPreviewProps {
  sale: Sale;
  onPrint: () => void;
  onEmail: () => void;
}

// CouponScanner - クーポン/回数券スキャン
interface CouponScannerProps {
  onScan: (code: string) => void;
  onManualInput: (code: string) => void;
}
```

#### 1.2.4 分析関連

```typescript
// DashboardCard - ダッシュボードカード
interface DashboardCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: string;
}

// SalesChart - 売上チャート
interface SalesChartProps {
  period: 'day' | 'week' | 'month' | 'year';
  storeId?: string;
  staffId?: string;
}

// RankingList - ランキングリスト
interface RankingListProps {
  type: 'sales' | 'productivity' | 'customers' | 'menus';
  period: Period;
  limit?: number;
}

// AnalyticsFilter - 分析フィルター
interface AnalyticsFilterProps {
  filters: FilterOptions;
  onChange: (filters: FilterOptions) => void;
}

// TagAnalytics - タグ別分析
interface TagAnalyticsProps {
  tagCategory: string;
  metric: 'sales' | 'count' | 'average';
  period: Period;
}
```

#### 1.2.5 AI関連

```typescript
// VoiceRecorder - 音声録音
interface VoiceRecorderProps {
  onStart: () => void;
  onStop: (audioBlob: Blob) => void;
  onTranscript: (text: string) => void;
  isRecording: boolean;
}

// ConversationPanel - 会話パネル
interface ConversationPanelProps {
  visitId: string;
  showTranscript?: boolean;
  showAnalysis?: boolean;
}

// AISuggestion - AI提案表示
interface AISuggestionProps {
  suggestion: Suggestion;
  onAccept: () => void;
  onDismiss: () => void;
}

// HairstylePreview - ヘアスタイルプレビュー
interface HairstylePreviewProps {
  customerPhoto: string;
  hairstyleImage: string;
  onApprove: () => void;
  onReject: () => void;
}

// PinterestBrowser - Pinterestブラウザ
interface PinterestBrowserProps {
  searchQuery?: string;
  onSelectImage: (image: PinterestImage) => void;
  favorites: string[];
}
```

#### 1.2.6 タグ関連

```typescript
// TagManager - タグ管理
interface TagManagerProps {
  entityType: EntityType;
  onTagCreate: (tag: Tag) => void;
  onTagUpdate: (tag: Tag) => void;
  onTagDelete: (tagId: string) => void;
}

// TagHierarchy - タグ階層表示/編集
interface TagHierarchyProps {
  tags: Tag[];
  onDragEnd: (result: DragResult) => void;
  onTagClick: (tag: Tag) => void;
  editable?: boolean;
}

// TagSelector - タグ選択
interface TagSelectorProps {
  entityType: EntityType;
  selectedTags: string[];
  onChange: (tagIds: string[]) => void;
  allowCreate?: boolean;
}

// TagBadge - タグバッジ
interface TagBadgeProps {
  tag: Tag;
  size?: 'small' | 'medium' | 'large';
  onRemove?: () => void;
}
```

---

## 2. 状態管理設計

### 2.1 Store構成 (Zustand)

```typescript
// stores/index.ts
export { useAuthStore } from './authStore';
export { useCompanyStore } from './companyStore';
export { useStoreStore } from './storeStore';
export { useStaffStore } from './staffStore';
export { useCustomerStore } from './customerStore';
export { useReservationStore } from './reservationStore';
export { useSaleStore } from './saleStore';
export { useMenuStore } from './menuStore';
export { useProductStore } from './productStore';
export { useTagStore } from './tagStore';
export { useAnalyticsStore } from './analyticsStore';
export { useSettingsStore } from './settingsStore';
export { useUIStore } from './uiStore';
```

### 2.2 主要Store定義

#### 2.2.1 AuthStore

```typescript
interface AuthState {
  user: User | null;
  staff: Staff | null;
  company: Company | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (data: Partial<Staff>) => Promise<void>;
}

type AuthStore = AuthState & AuthActions;
```

#### 2.2.2 CustomerStore

```typescript
interface CustomerState {
  customers: Customer[];
  selectedCustomer: Customer | null;
  karte: CustomerKarte | null;
  visitHistory: Visit[];
  isLoading: boolean;
  error: string | null;
  filters: CustomerFilters;
  pagination: Pagination;
}

interface CustomerActions {
  fetchCustomers: (filters?: CustomerFilters) => Promise<void>;
  fetchCustomer: (id: string) => Promise<void>;
  createCustomer: (data: CreateCustomerData) => Promise<Customer>;
  updateCustomer: (id: string, data: UpdateCustomerData) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  fetchKarte: (customerId: string) => Promise<void>;
  updateKarte: (customerId: string, data: UpdateKarteData) => Promise<void>;
  fetchVisitHistory: (customerId: string) => Promise<void>;
  setFilters: (filters: CustomerFilters) => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  addTag: (customerId: string, tagId: string) => Promise<void>;
  removeTag: (customerId: string, tagId: string) => Promise<void>;
}

type CustomerStore = CustomerState & CustomerActions;
```

#### 2.2.3 ReservationStore

```typescript
interface ReservationState {
  reservations: Reservation[];
  selectedReservation: Reservation | null;
  calendarView: 'day' | 'week' | 'month';
  selectedDate: Date;
  isLoading: boolean;
  error: string | null;
}

interface ReservationActions {
  fetchReservations: (params: FetchReservationsParams) => Promise<void>;
  createReservation: (data: CreateReservationData) => Promise<Reservation>;
  updateReservation: (id: string, data: UpdateReservationData) => Promise<void>;
  cancelReservation: (id: string, reason?: string) => Promise<void>;
  checkIn: (id: string) => Promise<void>;
  checkOut: (id: string) => Promise<void>;
  setCalendarView: (view: 'day' | 'week' | 'month') => void;
  setSelectedDate: (date: Date) => void;
  getAvailableSlots: (params: AvailableSlotsParams) => Promise<TimeSlot[]>;
}

type ReservationStore = ReservationState & ReservationActions;
```

#### 2.2.4 SaleStore

```typescript
interface SaleState {
  currentSale: CurrentSale | null;
  cart: CartItem[];
  payments: Payment[];
  discounts: Discount[];
  staffAssignments: StaffAssignment[];
  isProcessing: boolean;
  error: string | null;
}

interface CurrentSale {
  visitId: string;
  customerId: string;
  customer: Customer;
  primaryStaffId: string;
  nominationType: 'nominated' | 'free';
}

interface CartItem {
  id: string;
  type: 'menu' | 'product';
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  hairLength?: 'short' | 'medium' | 'long';
  staffAssignments: StaffAssignment[];
  discounts: Discount[];
}

interface SaleActions {
  startSale: (visitId: string) => Promise<void>;
  addToCart: (item: AddToCartData) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartItem: (cartItemId: string, data: UpdateCartItemData) => void;
  assignStaff: (cartItemId: string, assignment: StaffAssignment) => void;
  addPayment: (payment: Payment) => void;
  removePayment: (paymentId: string) => void;
  addDiscount: (discount: Discount) => void;
  removeDiscount: (discountId: string) => void;
  applyTicket: (ticketCode: string) => Promise<void>;
  calculateTotal: () => SaleTotals;
  checkout: () => Promise<Sale>;
  cancelSale: () => void;
  createRefund: (saleId: string, items: RefundItem[]) => Promise<void>;
}

type SaleStore = SaleState & SaleActions;
```

#### 2.2.5 TagStore

```typescript
interface TagState {
  tags: Tag[];
  tagHierarchy: TagHierarchyNode[];
  tagCategories: TagCategory[];
  isLoading: boolean;
  error: string | null;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  icon?: string;
  parentId: string | null;
  applicableTo: EntityType[];
  sortOrder: number;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

interface TagActions {
  fetchTags: () => Promise<void>;
  createTag: (data: CreateTagData) => Promise<Tag>;
  updateTag: (id: string, data: UpdateTagData) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  moveTag: (id: string, newParentId: string | null, newOrder: number) => Promise<void>;
  mergeTags: (sourceId: string, targetId: string) => Promise<void>;
  getTagsByEntity: (entityType: EntityType) => Tag[];
  getTagHierarchy: (entityType?: EntityType) => TagHierarchyNode[];
}

type TagStore = TagState & TagActions;
```

---

## 3. API詳細設計

### 3.1 認証API

#### POST /auth/signup
```typescript
// Request
interface SignupRequest {
  email: string;
  password: string;
  companyName: string;
  ownerName: string;
  phone: string;
  plan: 'basic' | 'professional' | 'enterprise';
}

// Response
interface SignupResponse {
  user: User;
  company: Company;
  staff: Staff;
  accessToken: string;
  refreshToken: string;
}
```

#### POST /auth/login
```typescript
// Request
interface LoginRequest {
  email: string;
  password: string;
}

// Response
interface LoginResponse {
  user: User;
  staff: Staff;
  company: Company;
  stores: Store[];
  accessToken: string;
  refreshToken: string;
}
```

### 3.2 顧客API

#### GET /customers
```typescript
// Query Parameters
interface GetCustomersParams {
  search?: string;
  tagIds?: string[];
  status?: 'active' | 'dormant' | 'lost';
  lastVisitFrom?: string;
  lastVisitTo?: string;
  sortBy?: 'name' | 'lastVisit' | 'totalSpent';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Response
interface GetCustomersResponse {
  customers: Customer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

#### POST /customers
```typescript
// Request
interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  firstNameKana: string;
  lastNameKana: string;
  gender?: 'male' | 'female' | 'other';
  birthDate?: string;
  phone?: string;
  email?: string;
  address?: Address;
  referralSource?: string;
  notes?: string;
  tagIds?: string[];
  consent: {
    privacyPolicy: boolean;
    marketing: boolean;
    photoUsage?: boolean;
  };
}

// Response
interface CreateCustomerResponse {
  customer: Customer;
}
```

#### GET /customers/:id/karte
```typescript
// Response
interface GetKarteResponse {
  karte: {
    customerId: string;
    hairCondition: HairCondition;
    scalpCondition: ScalpCondition;
    allergies: Allergy[];
    preferences: Preferences;
    lifestyle: Lifestyle;
    notes: string;
    photos: Photo[];
    colorHistory: ColorRecord[];
    permHistory: PermRecord[];
  };
}
```

### 3.3 予約API

#### GET /reservations
```typescript
// Query Parameters
interface GetReservationsParams {
  storeId?: string;
  staffId?: string;
  customerId?: string;
  dateFrom: string;
  dateTo: string;
  status?: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
}

// Response
interface GetReservationsResponse {
  reservations: Reservation[];
}

interface Reservation {
  id: string;
  customerId: string;
  customer: CustomerSummary;
  storeId: string;
  staffId: string;
  staff: StaffSummary;
  nominationType: 'nominated' | 'free';
  startTime: string;
  endTime: string;
  menus: ReservationMenu[];
  status: ReservationStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### POST /reservations
```typescript
// Request
interface CreateReservationRequest {
  customerId: string;
  storeId: string;
  staffId: string;
  nominationType: 'nominated' | 'free';
  startTime: string;
  menuIds: string[];
  notes?: string;
}

// Response
interface CreateReservationResponse {
  reservation: Reservation;
}
```

#### GET /reservations/available-slots
```typescript
// Query Parameters
interface GetAvailableSlotsParams {
  storeId: string;
  staffId?: string;
  date: string;
  duration: number; // minutes
}

// Response
interface GetAvailableSlotsResponse {
  slots: TimeSlot[];
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  staffId: string;
  staffName: string;
  available: boolean;
}
```

### 3.4 会計API

#### POST /functions/checkout
```typescript
// Request
interface CheckoutRequest {
  visitId: string;
  customerId: string;
  storeId: string;
  primaryStaffId: string;
  nominationType: 'nominated' | 'free';
  nominationFee: number;
  items: SaleItem[];
  payments: PaymentItem[];
  discounts: DiscountItem[];
  ticketUsages: TicketUsage[];
  pointsUsed: number;
  notes?: string;
}

interface SaleItem {
  type: 'menu' | 'product';
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  hairLength?: 'short' | 'medium' | 'long';
  staffAssignments: {
    staffId: string;
    role: 'primary' | 'worker1' | 'worker2';
    productivityRate: number;
  }[];
  processAssignments: {
    processId: string;
    staffId: string;
    productivityAmount: number;
  }[];
}

interface PaymentItem {
  method: PaymentMethod;
  amount: number;
  terminalTransactionId?: string;
}

interface DiscountItem {
  type: 'percentage' | 'amount' | 'coupon';
  value: number;
  couponId?: string;
  reason?: string;
}

// Response
interface CheckoutResponse {
  sale: Sale;
  receipt: Receipt;
  pointsEarned: number;
  newPointBalance: number;
}
```

#### POST /functions/refund
```typescript
// Request
interface RefundRequest {
  saleId: string;
  items: {
    saleItemId: string;
    quantity: number;
    reason: string;
  }[];
  refundMethod: PaymentMethod;
}

// Response
interface RefundResponse {
  refund: Refund;
  originalSale: Sale;
}
```

### 3.5 AI API

#### POST /functions/transcribe
```typescript
// Request (multipart/form-data)
interface TranscribeRequest {
  audio: File;
  visitId: string;
  language?: string;
}

// Response
interface TranscribeResponse {
  transcript: {
    id: string;
    text: string;
    segments: {
      start: number;
      end: number;
      text: string;
      speaker?: string;
    }[];
    language: string;
  };
}
```

#### POST /functions/analyze-conversation
```typescript
// Request
interface AnalyzeConversationRequest {
  visitId: string;
  transcript: string;
  customerId: string;
  customerContext: {
    visitHistory: VisitSummary[];
    purchaseHistory: PurchaseSummary[];
    preferences: Preferences;
  };
}

// Response
interface AnalyzeConversationResponse {
  analysis: {
    summary: string;
    topics: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    upsellOpportunities: {
      timing: string;
      suggestion: string;
      confidence: number;
    }[];
    crossSellOpportunities: {
      product: string;
      reason: string;
      confidence: number;
    }[];
    keyInsights: string[];
    nextVisitSuggestions: string[];
  };
}
```

#### POST /functions/generate-hairstyle
```typescript
// Request
interface GenerateHairstyleRequest {
  customerPhotoUrl: string;
  hairstyleImageUrl: string;
  customerId: string;
  options?: {
    adjustColor?: boolean;
    adjustLength?: boolean;
  };
}

// Response
interface GenerateHairstyleResponse {
  generatedImageUrl: string;
  thumbnailUrl: string;
  expiresAt: string;
}
```

### 3.6 分析API

#### GET /functions/analytics/sales
```typescript
// Query Parameters
interface SalesAnalyticsParams {
  storeId?: string;
  staffId?: string;
  period: 'day' | 'week' | 'month' | 'year' | 'custom';
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'day' | 'week' | 'month' | 'staff' | 'menu' | 'tag';
  tagIds?: string[];
}

// Response
interface SalesAnalyticsResponse {
  summary: {
    totalSales: number;
    salesCount: number;
    averageSale: number;
    comparisonPeriod: {
      totalSales: number;
      changePercent: number;
    };
  };
  breakdown: {
    label: string;
    value: number;
    count: number;
    percentage: number;
  }[];
  timeSeries: {
    date: string;
    value: number;
    count: number;
  }[];
  topMenus: {
    menuId: string;
    menuName: string;
    sales: number;
    count: number;
  }[];
  topProducts: {
    productId: string;
    productName: string;
    sales: number;
    count: number;
  }[];
}
```

#### GET /functions/analytics/productivity
```typescript
// Response
interface ProductivityAnalyticsResponse {
  staffProductivity: {
    staffId: string;
    staffName: string;
    totalProductivity: number;
    processBreakdown: {
      processId: string;
      processName: string;
      productivity: number;
      count: number;
    }[];
  }[];
  processProductivity: {
    processId: string;
    processName: string;
    totalProductivity: number;
    staffBreakdown: {
      staffId: string;
      staffName: string;
      productivity: number;
    }[];
  }[];
}
```

---

## 4. データモデル詳細

### 4.1 TypeScript型定義

```typescript
// types/customer.ts
export interface Customer {
  id: string;
  companyId: string;
  customerCode: string;
  firstName: string;
  lastName: string;
  firstNameKana: string;
  lastNameKana: string;
  gender: 'male' | 'female' | 'other' | null;
  birthDate: string | null;
  phone: string | null;
  email: string | null;
  address: Address | null;
  referralSource: string | null;
  status: 'active' | 'dormant' | 'lost';
  rank: string | null;
  totalVisits: number;
  totalSpent: number;
  lastVisitAt: string | null;
  nextVisitEstimate: string | null;
  points: number;
  notes: string | null;
  consent: CustomerConsent;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  postalCode: string;
  prefecture: string;
  city: string;
  street: string;
  building?: string;
}

export interface CustomerConsent {
  privacyPolicy: boolean;
  privacyPolicyAcceptedAt: string;
  marketing: boolean;
  marketingAcceptedAt: string | null;
  photoUsageSns: boolean;
  photoUsageHp: boolean;
  photoUsageAcceptedAt: string | null;
}

// types/reservation.ts
export interface Reservation {
  id: string;
  companyId: string;
  storeId: string;
  customerId: string;
  customer: CustomerSummary;
  staffId: string;
  staff: StaffSummary;
  nominationType: 'nominated' | 'free';
  startTime: string;
  endTime: string;
  duration: number;
  menus: ReservationMenu[];
  estimatedTotal: number;
  status: ReservationStatus;
  source: 'app' | 'phone' | 'walk_in' | 'external';
  notes: string | null;
  internalNotes: string | null;
  reminderSent: boolean;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

// types/sale.ts
export interface Sale {
  id: string;
  companyId: string;
  storeId: string;
  visitId: string;
  customerId: string;
  customer: CustomerSummary;
  primaryStaffId: string;
  primaryStaff: StaffSummary;
  nominationType: 'nominated' | 'free';
  nominationFee: number;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  payments: SalePayment[];
  pointsUsed: number;
  pointsEarned: number;
  ticketUsages: TicketUsage[];
  status: 'completed' | 'refunded' | 'partially_refunded';
  receiptNumber: string;
  invoiceNumber: string | null;
  notes: string | null;
  checkedInAt: string;
  checkedOutAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  type: 'menu' | 'product';
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  hairLengthType: 'short' | 'medium' | 'long' | null;
  hairLengthCharge: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  taxRate: number;
  staffAssignments: SaleItemStaffAssignment[];
  processAssignments: SaleItemProcessAssignment[];
}

export interface SaleItemStaffAssignment {
  id: string;
  saleItemId: string;
  staffId: string;
  staff: StaffSummary;
  role: 'primary' | 'worker1' | 'worker2';
  salesAmount: number;
  productivityAmount: number;
}

export interface SaleItemProcessAssignment {
  id: string;
  saleItemId: string;
  processId: string;
  processName: string;
  staffId: string;
  staff: StaffSummary;
  productivityAmount: number;
}

// types/tag.ts
export interface Tag {
  id: string;
  companyId: string;
  name: string;
  color: string;
  icon: string | null;
  parentId: string | null;
  applicableTo: EntityType[];
  sortOrder: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export type EntityType =
  | 'customer'
  | 'staff'
  | 'menu'
  | 'product'
  | 'material'
  | 'sale'
  | 'reservation'
  | 'store'
  | 'coupon'
  | 'ticket'
  | 'payment_method'
  | 'visit_record';

export interface TagHierarchyNode {
  tag: Tag;
  children: TagHierarchyNode[];
  level: number;
  path: string[];
}
```

---

## 5. 画面詳細設計

### 5.1 POS会計画面 (P-004)

#### 5.1.1 レイアウト

```
┌─────────────────────────────────────────────────────────────────────┐
│ ヘッダー: 顧客名 | 担当: 田中 | 指名: 本指名                          │
├─────────────────────────────────────┬───────────────────────────────┤
│                                     │                               │
│  メニュー選択エリア                  │  カートエリア                  │
│  ┌─────────────────────────────┐   │  ┌───────────────────────┐   │
│  │ [カテゴリタブ]              │   │  │ カット     ¥5,500    │   │
│  │ カット | カラー | パーマ ... │   │  │  └ 担当: 田中, 佐藤   │   │
│  ├─────────────────────────────┤   │  │                       │   │
│  │ ┌─────┐ ┌─────┐ ┌─────┐   │   │  │ カラー     ¥8,800    │   │
│  │ │カット │ │カット │ │レイヤ│   │   │  │  └ 担当: 田中        │   │
│  │ │¥5500 │ │&シャン│ │カット│   │   │  │  └ ロング料金 +¥1100 │   │
│  │ └─────┘ └─────┘ └─────┘   │   │  ├───────────────────────┤   │
│  │ ┌─────┐ ┌─────┐ ┌─────┐   │   │  │ 小計      ¥15,400   │   │
│  │ │グラデ │ │前髪  │ │キッズ│   │   │  │ 割引      -¥1,000   │   │
│  │ │カット│ │カット│ │カット│   │   │  │ 消費税     ¥1,440   │   │
│  │ └─────┘ └─────┘ └─────┘   │   │  │━━━━━━━━━━━━━━━━━━━│   │
│  │                             │   │  │ 合計      ¥15,840   │   │
│  │ [商品] [回数券] [割引]      │   │  └───────────────────────┘   │
│  └─────────────────────────────┘   │                               │
│                                     │  ┌───────────────────────┐   │
│                                     │  │  [割引追加] [クーポン] │   │
│                                     │  └───────────────────────┘   │
│                                     │                               │
│                                     │  ┌───────────────────────┐   │
│                                     │  │      [ 会計へ ]        │   │
│                                     │  └───────────────────────┘   │
└─────────────────────────────────────┴───────────────────────────────┘
```

#### 5.1.2 機能仕様

| 機能 | 仕様 |
|------|------|
| メニュー選択 | タップでカートに追加、長押しで詳細表示 |
| 髪の長さ | メニュー追加時にS/M/Lを選択（設定により自動適用可） |
| 担当者割り当て | カート項目タップで担当者割り当てモーダル表示 |
| 数量変更 | カート項目の±ボタンで数量変更 |
| 削除 | 左スワイプで削除 |
| 割引 | 割引ボタンで金額/率の割引入力 |
| クーポン | クーポンスキャンまたはコード入力 |
| 回数券 | 回数券スキャンまたはコード入力、適用可能メニューを自動判定 |

#### 5.1.3 担当者割り当てモーダル

```
┌─────────────────────────────────────┐
│ 担当者割り当て: カラー              │
├─────────────────────────────────────┤
│                                     │
│ 売上担当（主担当）                   │
│ ┌─────────────────────────────────┐ │
│ │ ◉ 田中 太郎                     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 作業担当者                          │
│ ┌─────────────────────────────────┐ │
│ │ 工程: カラー塗布                 │ │
│ │ 担当1: [田中 ▼] 70%             │ │
│ │ 担当2: [佐藤 ▼] 30%             │ │
│ ├─────────────────────────────────┤ │
│ │ 工程: シャンプー                 │ │
│ │ 担当1: [山田 ▼] 100%            │ │
│ │ 担当2: [--  ▼] 0%               │ │
│ ├─────────────────────────────────┤ │
│ │ 工程: ドライ                    │ │
│ │ 担当1: [田中 ▼] 100%            │ │
│ │ 担当2: [--  ▼] 0%               │ │
│ └─────────────────────────────────┘ │
│                                     │
│         [キャンセル]  [保存]        │
└─────────────────────────────────────┘
```

### 5.2 顧客カルテ画面 (S-008)

#### 5.2.1 レイアウト

```
┌─────────────────────────────────────────────────────────────────────┐
│ ◀ 戻る              山田 花子 様                    [編集] [写真]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  山田 花子（ヤマダ ハナコ）                          │
│  │          │  女性 | 35歳 | 会員ランク: ゴールド                  │
│  │  写真    │  📞 090-1234-5678 | ✉ hanako@example.com            │
│  │          │  来店回数: 24回 | 累計: ¥386,400                     │
│  └──────────┘  最終来店: 2025/11/15 | 次回予測: 2025/12/10頃       │
│                                                                     │
│  [タグ] VIP | くせ毛 | カラー派 | 白髪ケア                         │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ [基本情報] [髪質・頭皮] [施術履歴] [写真] [会話記録] [購入履歴]     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  髪質・頭皮情報                                    最終更新: 11/15  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 髪質                                                        │   │
│  │  硬さ: やや柔らかい | 太さ: 普通 | 量: 多い                 │   │
│  │  くせ: 波状毛（レベル2）                                    │   │
│  │  ダメージ: 毛先にややダメージあり                           │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ 白髪                                                        │   │
│  │  白髪率: 20% | 分布: こめかみ・分け目に集中                 │   │
│  │  伸び速度: 約1.5cm/月 → 推奨来店周期: 5週間                 │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ 頭皮                                                        │   │
│  │  状態: やや乾燥気味 | 敏感: なし                            │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ アレルギー・注意事項                                        │   │
│  │  ⚠ ジアミンアレルギー（要パッチテスト）                    │   │
│  │  パッチテスト: 2025/10/20 OK                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  カラーレシピ履歴                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 2025/11/15 - 担当: 田中                                     │   │
│  │  根元: ミルボン オルディーブ 8NB 40g + OXY 3% 40g          │   │
│  │  毛先: イルミナ オーシャン 8 30g + OXY 1.5% 30g            │   │
│  │  放置: 根元25分 → 毛先塗布後15分                            │   │
│  │  仕上がり: 自然なアッシュベージュ、白髪カバー◎             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 タグ管理画面 (A-011)

#### 5.3.1 レイアウト

```
┌─────────────────────────────────────────────────────────────────────┐
│ ◀ 設定              タグ管理                        [+ 新規タグ]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 対象: [全て ▼]  検索: [________________] 🔍                       │
│                                                                     │
├──────────────────────────────┬──────────────────────────────────────┤
│                              │                                      │
│  タグ階層                    │  タグ詳細                            │
│  ┌────────────────────────┐ │  ┌──────────────────────────────┐   │
│  │ 📁 メニューカテゴリ     │ │  │ タグ名: カラー               │   │
│  │   ├─ 🏷 カット         │ │  │                              │   │
│  │   ├─ 🏷 カラー ◀━━━━━━│━│━━│ 色: [████████] 🎨            │   │
│  │   │   ├─ ワンカラー    │ │  │                              │   │
│  │   │   ├─ ハイライト    │ │  │ アイコン: [palette ▼]        │   │
│  │   │   ├─ ダブルカラー  │ │  │                              │   │
│  │   │   └─ 白髪染め      │ │  │ 適用対象:                    │   │
│  │   ├─ 🏷 パーマ         │ │  │ ☑ メニュー                   │   │
│  │   ├─ 🏷 トリートメント │ │  │ ☑ 施術記録                   │   │
│  │   └─ 🏷 ヘッドスパ     │ │  │ ☐ 顧客                       │   │
│  │                        │ │  │ ☐ 商品                       │   │
│  │ 📁 顧客属性            │ │  │                              │   │
│  │   ├─ 🏷 VIP           │ │  │ 使用数: 45件                 │   │
│  │   ├─ 🏷 新規          │ │  │                              │   │
│  │   └─ 🏷 休眠          │ │  │ 親タグ: メニューカテゴリ     │   │
│  │                        │ │  │                              │   │
│  │ 📁 髪質               │ │  │ 子タグ:                      │   │
│  │   ├─ 🏷 くせ毛        │ │  │  ・ワンカラー (12件)         │   │
│  │   ├─ 🏷 細毛          │ │  │  ・ハイライト (8件)          │   │
│  │   └─ 🏷 ダメージ毛    │ │  │  ・ダブルカラー (5件)        │   │
│  │                        │ │  │  ・白髪染め (20件)           │   │
│  │ 📁 支払い方法          │ │  │                              │   │
│  │   ├─ 🏷 現金          │ │  │ [削除] [マージ]    [保存]    │   │
│  │   ├─ 🏷 クレジット    │ │  └──────────────────────────────┘   │
│  │   └─ 🏷 電子マネー    │ │                                      │
│  └────────────────────────┘ │                                      │
│                              │                                      │
│  ※ドラッグ&ドロップで       │                                      │
│    階層を変更できます        │                                      │
│                              │                                      │
└──────────────────────────────┴──────────────────────────────────────┘
```

---

## 6. バリデーションルール

### 6.1 顧客データ

| フィールド | ルール |
|------------|--------|
| firstName | 必須, 1-50文字 |
| lastName | 必須, 1-50文字 |
| firstNameKana | 必須, カタカナのみ, 1-50文字 |
| lastNameKana | 必須, カタカナのみ, 1-50文字 |
| phone | 任意, 電話番号形式 |
| email | 任意, メール形式 |
| birthDate | 任意, 過去の日付 |
| postalCode | 任意, 郵便番号形式（XXX-XXXX） |

### 6.2 予約データ

| フィールド | ルール |
|------------|--------|
| customerId | 必須, 存在するcustomer |
| storeId | 必須, 存在するstore |
| staffId | 必須, 存在するstaff, 当該店舗に所属 |
| startTime | 必須, 現在以降, シフト内 |
| menuIds | 必須, 1件以上, 存在するmenu |

### 6.3 会計データ

| フィールド | ルール |
|------------|--------|
| items | 必須, 1件以上 |
| payments | 必須, 合計が請求額以上 |
| primaryStaffId | 必須, 存在するstaff |
| staffAssignments | 各itemに対して合計100% |

---

## 7. セキュリティ詳細

### 7.1 認証フロー詳細

```
1. ログインリクエスト
   Client → Supabase Auth: email, password

2. 認証成功
   Supabase Auth → Client: access_token (JWT), refresh_token

3. APIリクエスト
   Client → Supabase API: Authorization: Bearer {access_token}

4. RLSチェック
   Supabase → PostgreSQL: JWT内のuser_metadata.company_idで行フィルタ

5. トークンリフレッシュ（期限切れ時）
   Client → Supabase Auth: refresh_token
   Supabase Auth → Client: new access_token, new refresh_token
```

### 7.2 機密データの暗号化

| データ | 暗号化方式 | 保存場所 |
|--------|------------|----------|
| パスワード | bcrypt (hash) | Supabase Auth |
| カード情報 | 保存しない | Stripe |
| 個人情報 | AES-256 | PostgreSQL |
| 施術写真 | なし（アクセス制御で保護） | Supabase Storage |

### 7.3 アクセス制御マトリクス

| リソース | Owner | Manager | Stylist | Assistant | Customer |
|----------|-------|---------|---------|-----------|----------|
| 全店舗売上 | RW | R | - | - | - |
| 自店舗売上 | RW | RW | R | - | - |
| 顧客情報 | RW | RW | RW | R | 自分のみR |
| スタッフ情報 | RW | RW | R | R | - |
| メニューマスタ | RW | RW | R | R | R |
| 予約 | RW | RW | RW | R | 自分のみRW |
| 会計 | RW | RW | RW | - | - |
| 分析 | R | R | 自分のみR | - | - |
| 設定 | RW | R | - | - | - |

R: Read, W: Write

### 7.4 フロントエンド権限制御 (usePermissions)

```typescript
// packages/core/src/hooks/usePermissions.ts

// ロール階層
export type StaffRole = 'assistant' | 'staff' | 'manager' | 'owner';

// ロールレベル（数値が大きいほど権限が高い）
const ROLE_LEVELS = {
  assistant: 0,
  staff: 1,
  manager: 2,
  owner: 3,
};

// 機能権限 (27種類)
interface FeaturePermissions {
  // 顧客管理
  viewCustomers: boolean;
  editCustomers: boolean;
  deleteCustomers: boolean;

  // 予約管理
  viewReservations: boolean;
  createReservations: boolean;
  editReservations: boolean;
  cancelReservations: boolean;

  // 会計
  processCheckout: boolean;
  applyDiscounts: boolean;
  processRefunds: boolean;
  viewSalesHistory: boolean;

  // 在庫
  viewProducts: boolean;
  editProducts: boolean;
  adjustStock: boolean;

  // スタッフ管理
  viewStaff: boolean;
  editStaff: boolean;
  manageShifts: boolean;
  viewAllAttendance: boolean;

  // レポート
  viewBasicReports: boolean;
  viewDetailedReports: boolean;
  exportReports: boolean;

  // 設定
  viewStoreSettings: boolean;
  editStoreSettings: boolean;
  manageMenus: boolean;
  manageCoupons: boolean;
  manageTickets: boolean;

  // 管理
  accessAdminPanel: boolean;
  manageCompanySettings: boolean;
  viewAuditLogs: boolean;
}

// 使用例
const { hasPermission, hasMinRole, isManager } = usePermissions();
if (hasPermission('processRefunds')) { /* 返金処理可能 */ }
if (hasMinRole('manager')) { /* マネージャー以上 */ }
```

---

## 8. 追加実装済み機能

### 8.1 スタッフパフォーマンスサービス

```typescript
// packages/api/src/services/staffPerformanceService.ts

interface StaffPerformance {
  staffId: string;
  staffName: string;
  totalSales: number;      // 総売上
  saleCount: number;       // 売上件数
  nominationCount: number; // 指名数
  nominationRevenue: number; // 指名料収入
  customerCount: number;   // 担当顧客数
  averageSale: number;     // 平均客単価
  productSales: number;    // 商品売上
  menuSales: number;       // メニュー売上
}

// 主要API
staffPerformanceService.getPerformance(storeId, startDate, endDate);
staffPerformanceService.getSalesRanking(storeId, startDate, endDate, limit);
staffPerformanceService.getNominationRanking(storeId, startDate, endDate, limit);
staffPerformanceService.getCustomerRanking(storeId, startDate, endDate, limit);
staffPerformanceService.getMonthlySummary(staffId, year, month);
staffPerformanceService.calculateIncentive(staffId, startDate, endDate, rates);
staffPerformanceService.getDailyPerformance(storeId, date);
```

### 8.2 予約リマインダー自動送信

```typescript
// supabase/functions/reservation-reminder/index.ts
// Cron Jobまたは手動トリガーで実行

// リクエスト
interface ReminderRequest {
  reminderHours?: number;  // 何時間前に送信（デフォルト: 24）
  dryRun?: boolean;        // テスト実行（実際には送信しない）
}

// レスポンス
interface ReminderResponse {
  success: boolean;
  processedCount: number;
  successCount: number;
  failCount: number;
  pushCount: number;       // プッシュ通知送信数
  results: ReminderResult[];
}

// packages/api/src/services/reminderSchedulerService.ts
reminderSchedulerService.getStats(companyId);             // 統計情報
reminderSchedulerService.getUpcomingReminders(companyId); // 送信待ちリスト
reminderSchedulerService.sendReminder(reservationId);     // 手動送信
reminderSchedulerService.sendBatchReminders(companyId);   // 一括送信
reminderSchedulerService.triggerScheduledReminders();     // Edge Function呼び出し
```

### 8.3 ポイント設定・有効期限管理

```typescript
// packages/api/src/services/pointService.ts

interface PointSettings {
  pointRate: number;      // ポイント付与率（例: 0.01 = 1%）
  expiryMonths: number;   // 有効期限月数（0 = 無期限）
  minRedeemPoints: number; // 最低利用ポイント
  pointValue: number;     // 1ポイントの価値（円）
}

// 主要API
pointService.getSettings(companyId);
pointService.updateSettings(companyId, settings);
pointService.calculatePoints(companyId, amount);
pointService.calculateExpiryDate(companyId);
pointService.earnPoints(companyId, customerId, points, saleId, description);
// → 有効期限は自動計算
```

### 8.4 予約枠のシフト連動

```typescript
// packages/api/src/services/reservationService.ts

// getAvailableSlots() の動作
// 1. 店舗の営業時間を取得
// 2. スタッフのシフトを取得（staffIdが指定された場合）
// 3. シフト時間内かつ営業時間内のスロットのみ生成
// 4. 休憩時間のスロットを除外
// 5. 既存予約とのコンフリクトをチェック

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  staffId?: string;
}

// シフト情報
interface StaffShift {
  start_time: string;   // "09:00:00"
  end_time: string;     // "18:00:00"
  break_minutes: number; // 60
}

// 休憩時間はシフトの中間に配置
// 例: 9:00-18:00シフト、60分休憩 → 13:00-14:00が休憩
```

### 8.5 LINE通知連携

```typescript
// packages/api/src/services/lineService.ts

interface LineConfig {
  channelAccessToken: string;
  channelSecret: string;
  webhookUrl?: string;
}

interface LineMessage {
  type: 'text' | 'flex' | 'template';
  text?: string;
  altText?: string;
  contents?: Record<string, unknown>; // Flex Message
}

// 主要API
lineService.getConfig(companyId);
lineService.saveConfig(companyId, config);
lineService.sendTextMessage(companyId, lineUserId, text);
lineService.sendReservationReminder(companyId, lineUserId, details);
lineService.sendReservationConfirmation(companyId, lineUserId, details);
lineService.sendThankYouMessage(companyId, lineUserId, details);
lineService.linkCustomer(customerId, lineUserId);
lineService.findCustomerByLineId(companyId, lineUserId);
lineService.processWebhookEvent(companyId, event);
```

### 8.6 SMS/メール通知

```typescript
// packages/api/src/services/smsService.ts

interface SmsConfig {
  provider: 'twilio' | 'aws_sns' | 'vonage';
  accountSid?: string;
  authToken?: string;
  fromNumber: string;
}

// 主要API
smsService.send(companyId, { to, message });
smsService.sendReservationReminder(companyId, phone, details);
smsService.sendReservationConfirmation(companyId, phone, details);

// packages/api/src/services/emailService.ts

interface EmailConfig {
  provider: 'sendgrid' | 'ses' | 'mailgun' | 'smtp';
  apiKey?: string;
  fromEmail: string;
  fromName: string;
}

// 主要API
emailService.send(companyId, { to, subject, text, html });
emailService.sendReservationReminder(companyId, email, details);
emailService.sendReservationConfirmation(companyId, email, details);
emailService.sendThankYouEmail(companyId, email, details);
```

### 8.7 キャンセルポリシー・ペナルティ管理

```typescript
// packages/api/src/services/cancellationService.ts

interface CancellationPolicy {
  id: string;
  companyId: string;
  name: string;
  rules: CancellationRule[];      // 時間帯別料金ルール
  noShowFeePercentage: number;    // 無断キャンセル料率
  maxNoShowsBeforeBlacklist: number; // ブラックリスト閾値
}

interface CancellationRule {
  hoursBeforeAppointment: number; // 例: 24
  feePercentage: number;          // 例: 50
  description: string;            // "24時間以内のキャンセル"
}

interface CancellationFeeResult {
  feePercentage: number;
  feeAmount: number;
  ruleApplied: string;
  isNoShow: boolean;
}

// 主要API
cancellationService.getPolicy(companyId, storeId);
cancellationService.savePolicy(policy);
cancellationService.calculateFee(reservationId, isNoShow);
cancellationService.processCancellation(reservationId, reason, isNoShow, waiveFee);
cancellationService.getCustomerHistory(companyId, customerId);
cancellationService.blacklistCustomer(companyId, customerId, reason);
cancellationService.getAtRiskCustomers(companyId);
```

### 8.8 会員ランク管理

```typescript
// packages/api/src/services/memberRankService.ts

interface MemberRank {
  id: string;
  companyId: string;
  name: string;                 // "シルバー", "ゴールド", etc.
  level: number;                // 1, 2, 3, 4
  color: string;                // "#C0C0C0"
  minSpend?: number;            // 最低利用金額
  minVisits?: number;           // 最低来店回数
  pointMultiplier: number;      // ポイント倍率
  discountPercentage: number;   // 割引率
  benefits: string[];           // 特典説明
}

interface MemberRankConfig {
  companyId: string;
  calculationBasis: 'spend' | 'visits' | 'points' | 'combined';
  calculationPeriodMonths: number; // 計算期間（0=永久）
  autoDowngrade: boolean;          // 自動降格
}

interface CustomerRankInfo {
  customerId: string;
  currentRank: MemberRank;
  nextRank?: MemberRank;
  totalSpend: number;
  spendToNextRank?: number;
  visitsToNextRank?: number;
  rankHistory: RankChangeRecord[];
}

// 主要API
memberRankService.getRanks(companyId);
memberRankService.getConfig(companyId);
memberRankService.getCustomerRankInfo(companyId, customerId);
memberRankService.checkAndUpdateRank(companyId, customerId);
memberRankService.getCustomerDiscount(companyId, customerId);
memberRankService.getPointMultiplier(companyId, customerId);
memberRankService.processAllCustomerRanks(companyId);
```

### 8.9 売上履歴・赤伝票UI

```typescript
// apps/staff/app/admin/sales-history.tsx

// 機能概要
// - 日付別売上一覧表示
// - 完了売上と取消済み（赤伝票）のタブ切り替え
// - 売上詳細モーダル
// - 取消処理（赤伝票発行）モーダル
// - 権限チェック（void_sales権限必要）

// 使用API
saleService.getDailySales(storeId, date);      // 日別売上取得
saleService.getVoidedSales(storeId, start, end); // 取消済み取得
saleService.void(id, reason, voidedBy);          // 売上取消

// 取消処理フロー
// 1. 取消理由入力（必須）
// 2. void_sales権限チェック
// 3. saleService.void() 呼び出し
// 4. ポイント自動戻し（付与分取消、使用分復元）
// 5. 顧客の合計利用金額更新
```

---

**以上**
