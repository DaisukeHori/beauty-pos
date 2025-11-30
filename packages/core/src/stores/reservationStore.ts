import { create } from 'zustand';
import type { Reservation, TimeSlot } from '../models';

type CalendarView = 'day' | 'week' | 'month';

interface ReservationState {
  reservations: Reservation[];
  selectedReservation: Reservation | null;
  calendarView: CalendarView;
  selectedDate: Date;
  availableSlots: TimeSlot[];
  isLoading: boolean;
  error: string | null;
}

interface ReservationActions {
  setReservations: (reservations: Reservation[]) => void;
  setSelectedReservation: (reservation: Reservation | null) => void;
  setCalendarView: (view: CalendarView) => void;
  setSelectedDate: (date: Date) => void;
  setAvailableSlots: (slots: TimeSlot[]) => void;
  addReservation: (reservation: Reservation) => void;
  updateReservation: (id: string, updates: Partial<Reservation>) => void;
  removeReservation: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: ReservationState = {
  reservations: [],
  selectedReservation: null,
  calendarView: 'day',
  selectedDate: new Date(),
  availableSlots: [],
  isLoading: false,
  error: null,
};

export const useReservationStore = create<ReservationState & ReservationActions>((set) => ({
  ...initialState,

  setReservations: (reservations) =>
    set({ reservations }),

  setSelectedReservation: (selectedReservation) =>
    set({ selectedReservation }),

  setCalendarView: (calendarView) =>
    set({ calendarView }),

  setSelectedDate: (selectedDate) =>
    set({ selectedDate }),

  setAvailableSlots: (availableSlots) =>
    set({ availableSlots }),

  addReservation: (reservation) =>
    set((state) => ({
      reservations: [...state.reservations, reservation],
    })),

  updateReservation: (id, updates) =>
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
      selectedReservation:
        state.selectedReservation?.id === id
          ? { ...state.selectedReservation, ...updates }
          : state.selectedReservation,
    })),

  removeReservation: (id) =>
    set((state) => ({
      reservations: state.reservations.filter((r) => r.id !== id),
      selectedReservation:
        state.selectedReservation?.id === id ? null : state.selectedReservation,
    })),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error, isLoading: false }),

  reset: () =>
    set(initialState),
}));
