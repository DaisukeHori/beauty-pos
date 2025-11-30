import { create } from 'zustand';
import type { Visit } from '../models';

interface VisitState {
  visits: Visit[];
  currentVisit: Visit | null;
  todayVisits: Visit[];
  isLoading: boolean;
  error: string | null;
}

interface VisitActions {
  setVisits: (visits: Visit[]) => void;
  setCurrentVisit: (visit: Visit | null) => void;
  setTodayVisits: (visits: Visit[]) => void;
  addVisit: (visit: Visit) => void;
  updateVisit: (id: string, updates: Partial<Visit>) => void;
  removeVisit: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: VisitState = {
  visits: [],
  currentVisit: null,
  todayVisits: [],
  isLoading: false,
  error: null,
};

export const useVisitStore = create<VisitState & VisitActions>((set) => ({
  ...initialState,

  setVisits: (visits) =>
    set({ visits }),

  setCurrentVisit: (currentVisit) =>
    set({ currentVisit }),

  setTodayVisits: (todayVisits) =>
    set({ todayVisits }),

  addVisit: (visit) =>
    set((state) => ({
      visits: [...state.visits, visit],
      todayVisits: isToday(new Date(visit.checkInAt))
        ? [...state.todayVisits, visit]
        : state.todayVisits,
    })),

  updateVisit: (id, updates) =>
    set((state) => ({
      visits: state.visits.map((v) =>
        v.id === id ? { ...v, ...updates } : v
      ),
      currentVisit:
        state.currentVisit?.id === id
          ? { ...state.currentVisit, ...updates }
          : state.currentVisit,
      todayVisits: state.todayVisits.map((v) =>
        v.id === id ? { ...v, ...updates } : v
      ),
    })),

  removeVisit: (id) =>
    set((state) => ({
      visits: state.visits.filter((v) => v.id !== id),
      currentVisit:
        state.currentVisit?.id === id ? null : state.currentVisit,
      todayVisits: state.todayVisits.filter((v) => v.id !== id),
    })),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error, isLoading: false }),

  reset: () =>
    set(initialState),
}));

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}
