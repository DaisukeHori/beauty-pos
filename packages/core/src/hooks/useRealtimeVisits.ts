import { useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@beauty-pos/api';
import { useVisitStore } from '../stores/visitStore';
import type { Visit } from '../models';

interface UseRealtimeVisitsOptions {
  companyId: string;
  storeId: string;
  enabled?: boolean;
}

export function useRealtimeVisits({ companyId, storeId, enabled = true }: UseRealtimeVisitsOptions) {
  const { addVisit, updateVisit, removeVisit } = useVisitStore();

  const handleInsert = useCallback((payload: { new: Visit }) => {
    addVisit(payload.new);
  }, [addVisit]);

  const handleUpdate = useCallback((payload: { new: Visit; old: { id: string } }) => {
    updateVisit(payload.old.id, payload.new);
  }, [updateVisit]);

  const handleDelete = useCallback((payload: { old: { id: string } }) => {
    removeVisit(payload.old.id);
  }, [removeVisit]);

  useEffect(() => {
    if (!enabled || !companyId || !storeId) return;

    const supabase = getSupabaseClient();

    const channel = supabase
      .channel(`visits:${companyId}:${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'visits',
          filter: `company_id=eq.${companyId}`,
        },
        handleInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'visits',
          filter: `company_id=eq.${companyId}`,
        },
        handleUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'visits',
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
