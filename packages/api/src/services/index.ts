export { authService } from './authService';
export type { SignUpData, SignInData, AuthUser } from './authService';

export { companyService } from './companyService';
export type { Company, CompanyInsert, CompanyUpdate } from './companyService';

export { storeService } from './storeService';
export type { Store, StoreInsert, StoreUpdate } from './storeService';

export { staffService } from './staffService';
export type { Staff, StaffInsert, StaffUpdate, StaffStore, StaffWithStores } from './staffService';

export { customerService } from './customerService';
export type {
  Customer,
  CustomerInsert,
  CustomerUpdate,
  CustomerKarte,
  CustomerPhoto,
  ColorRecipe,
  PermRecipe,
  CustomerWithDetails,
  CustomerSearchParams,
} from './customerService';

export { menuService } from './menuService';
export type {
  MenuCategory,
  Menu,
  Process,
  MenuProcess,
  MenuWithDetails,
} from './menuService';

export { reservationService } from './reservationService';
export type {
  Reservation,
  ReservationInsert,
  ReservationUpdate,
  ReservationWithDetails,
  TimeSlot,
  ReservationSearchParams,
} from './reservationService';

export { visitService } from './visitService';
export type {
  Visit,
  VisitInsert,
  VisitUpdate,
  VisitWithDetails,
} from './visitService';

export { saleService } from './saleService';
export type {
  Sale,
  SaleItem,
  SalePayment,
  SaleDiscount,
  SaleItemStaffAssignment,
  SaleItemProcessAssignment,
  SaleWithDetails,
  CreateSaleData,
  CreateSaleItemData,
  CreateStaffAssignmentData,
  CreateProcessAssignmentData,
  CreatePaymentData,
  CreateDiscountData,
} from './saleService';

export { ticketService } from './ticketService';
export type {
  Ticket,
  TicketInsert,
  TicketUpdate,
  TicketUsage,
  TicketWithDetails,
} from './ticketService';

export { couponService } from './couponService';
export type {
  Coupon,
  CouponInsert,
  CouponUpdate,
  CouponUsage,
  CouponWithUsages,
} from './couponService';

export { tagService } from './tagService';
export type {
  Tag,
  TagInsert,
  TagUpdate,
  TagItem,
  EntityType,
  TagHierarchyNode,
} from './tagService';

export { aiService } from './aiService';
export type {
  ConversationRecording,
  ConversationTranscript,
  ConversationAnalysis,
  AISuggestion,
  HairstyleSimulation,
  TranscriptSegment,
  AnalysisResult,
} from './aiService';

export { productService } from './productService';
export type {
  Product,
  ProductInsert,
  ProductUpdate,
} from './productService';

export { dailyReportService } from './dailyReportService';
export type {
  DailyReport,
  DailyReportInsert,
  DailyReportUpdate,
} from './dailyReportService';

export { hairStyleService } from './hairStyleService';
export type {
  HairStyleCategory,
  HairStyle,
  HairStyleWithCategory,
  HairStyleFavorite,
  HairStyleInsert,
  HairStyleUpdate,
  HairStyleSearchParams,
} from './hairStyleService';

export { proposalService } from './proposalService';
export type {
  StyleProposal,
  StyleProposalWithDetails,
  CreateProposalData,
} from './proposalService';

export { pointService } from './pointService';
export type {
  PointTransaction,
  PointTransactionInsert,
} from './pointService';

export { shiftService, attendanceService } from './shiftService';
export type {
  Shift,
  ShiftInsert,
  ShiftUpdate,
  Attendance,
  AttendanceInsert,
  AttendanceUpdate,
} from './shiftService';

export { notificationService, notificationPreferenceService } from './notificationService';
export type {
  Notification,
  NotificationInsert,
  NotificationTemplate,
  NotificationPreference,
} from './notificationService';

export { printService } from './printService';
export type {
  ReceiptData,
  PrintJob,
  Printer,
} from './printService';
