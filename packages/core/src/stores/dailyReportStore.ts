import { create } from 'zustand';

export interface DailyReportSummary {
  date: string;
  totalSales: number;
  totalTransactions: number;
  averageTicket: number;
  visitCount: number;
  newCustomerCount: number;
  reservationCount: number;
  noShowCount: number;
  cancelCount: number;
  menuSales: number;
  productSales: number;
  cashTotal: number;
  cardTotal: number;
  electronicMoneyTotal: number;
  qrPaymentTotal: number;
  creditTotal: number;
  pointsUsed: number;
  pointsEarned: number;
  discountTotal: number;
}

export interface StaffSummary {
  staffId: string;
  staffName: string;
  salesTotal: number;
  productivityTotal: number;
  transactionCount: number;
  averageTicket: number;
  customerCount: number;
}

export interface HourlySales {
  hour: number;
  sales: number;
  transactions: number;
}

export interface DailyReport {
  id: string;
  date: string;
  summary: DailyReportSummary;
  staffSummaries: StaffSummary[];
  hourlySales: HourlySales[];
  notes?: string;
  closedBy?: string;
  closedAt?: string;
  isClosed: boolean;
}

interface DailyReportState {
  currentReport: DailyReport | null;
  recentReports: DailyReport[];
  selectedReport: DailyReport | null;
  selectedDate: string;
  isLoading: boolean;
  error: string | null;
}

interface DailyReportActions {
  setCurrentReport: (report: DailyReport | null) => void;
  setRecentReports: (reports: DailyReport[]) => void;
  setSelectedReport: (report: DailyReport | null) => void;
  setSelectedDate: (date: string) => void;
  updateReportNotes: (notes: string) => void;
  closeReport: (closedBy: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: DailyReportState = {
  currentReport: null,
  recentReports: [],
  selectedReport: null,
  selectedDate: new Date().toISOString().split('T')[0],
  isLoading: false,
  error: null,
};

export const useDailyReportStore = create<DailyReportState & DailyReportActions>((set, get) => ({
  ...initialState,

  setCurrentReport: (currentReport) =>
    set({ currentReport }),

  setRecentReports: (recentReports) =>
    set({ recentReports }),

  setSelectedReport: (selectedReport) =>
    set({ selectedReport }),

  setSelectedDate: (selectedDate) =>
    set({ selectedDate }),

  updateReportNotes: (notes) =>
    set((state) => ({
      currentReport: state.currentReport
        ? { ...state.currentReport, notes }
        : null,
    })),

  closeReport: (closedBy) =>
    set((state) => ({
      currentReport: state.currentReport
        ? {
            ...state.currentReport,
            isClosed: true,
            closedBy,
            closedAt: new Date().toISOString(),
          }
        : null,
    })),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error, isLoading: false }),

  reset: () =>
    set(initialState),
}));
