import { useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@beauty-pos/api';
import { useReservationStore } from '../stores/reservationStore';
import type { Reservation } from '../models';

interface UseRealtimeReservationsOptions {
  companyId: string;
  storeId: string;
  enabled?: boolean;
}

export function useRealtimeReservations({ companyId, storeId, enabled = true }: UseRealtimeReservationsOptions) {
  const { addReservation, updateReservation, removeReservation } = useReservationStore();

  const handleInsert = useCallback((payload: { new: Reservation }) => {
    addReservation(payload.new);
  }, [addReservation]);

  const handleUpdate = useCallback((payload: { new: Reservation; old: { id: string } }) => {
    updateReservation(payload.old.id, payload.new);
  }, [updateReservation]);

  const handleDelete = useCallback((payload: { old: { id: string } }) => {
    removeReservation(payload.old.id);
  }, [removeReservation]);

  useEffect(() => {
    if (!enabled || !companyId || !storeId) return;

    const supabase = getSupabaseClient();

    const channel = supabase
      .channel(`reservations:${companyId}:${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reservations',
          filter: `company_id=eq.${companyId}`,
        },
        handleInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reservations',
          filter: `company_id=eq.${companyId}`,
        },
        handleUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'reservations',
          filter: `company_id=eq.${companyId}`,
        },
        handleDelete
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, storeId, enabled, handleInsert, handleUpdate, handleDelete]);
}
