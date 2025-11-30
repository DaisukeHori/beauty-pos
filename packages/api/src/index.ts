// Supabase Client
export { initializeSupabase, getSupabaseClient, resetSupabaseClient } from './client';
export type { SupabaseConfig, SupabaseClient } from './client';

// Database Types
export type { Database, Tables, InsertTables, UpdateTables, Json } from './types/database';

// Services
export * from './services';

// Re-export commonly used types
export type {
  // Auth
  SignUpData,
  SignInData,
  AuthUser,
  // Company & Store
  Company,
  Store,
  // Staff
  Staff,
  StaffWithStores,
  // Customer
  Customer,
  CustomerWithDetails,
  CustomerKarte,
  CustomerPhoto,
  ColorRecipe,
  PermRecipe,
  // Menu
  MenuCategory,
  Menu,
  Process,
  MenuWithDetails,
  // Reservation & Visit
  Reservation,
  ReservationWithDetails,
  Visit,
  VisitWithDetails,
  // Sale
  Sale,
  SaleItem,
  SalePayment,
  SaleWithDetails,
  CreateSaleData,
  // Ticket & Coupon
  Ticket,
  TicketWithDetails,
  Coupon,
  CouponWithUsages,
  // Tag
  Tag,
  TagHierarchyNode,
  EntityType,
  // AI
  AISuggestion,
  HairstyleSimulation,
  ConversationAnalysis,
} from './services';
