import { create } from 'zustand';
import type { Staff } from '../models';

interface StaffState {
  staff: Staff[];
  selectedStaff: Staff | null;
  isLoading: boolean;
  error: string | null;
}

interface StaffActions {
  setStaff: (staff: Staff[]) => void;
  setSelectedStaff: (staff: Staff | null) => void;
  addStaff: (staff: Staff) => void;
  updateStaff: (id: string, updates: Partial<Staff>) => void;
  removeStaff: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: StaffState = {
  staff: [],
  selectedStaff: null,
  isLoading: false,
  error: null,
};

export const useStaffStore = create<StaffState & StaffActions>((set) => ({
  ...initialState,

  setStaff: (staff) =>
    set({ staff }),

  setSelectedStaff: (selectedStaff) =>
    set({ selectedStaff }),

  addStaff: (member) =>
    set((state) => ({
      staff: [...state.staff, member],
    })),

  updateStaff: (id, updates) =>
    set((state) => ({
      staff: state.staff.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
      selectedStaff:
        state.selectedStaff?.id === id
          ? { ...state.selectedStaff, ...updates }
          : state.selectedStaff,
    })),

  removeStaff: (id) =>
    set((state) => ({
      staff: state.staff.filter((s) => s.id !== id),
      selectedStaff:
        state.selectedStaff?.id === id ? null : state.selectedStaff,
    })),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error, isLoading: false }),

  reset: () =>
    set(initialState),
}));
