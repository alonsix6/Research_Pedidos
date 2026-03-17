'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Request } from '@/lib/types';
import { RealtimeChannel } from '@supabase/supabase-js';

const TEAM_ID = process.env.NEXT_PUBLIC_TEAM_ID;

interface UseRealtimeRequestsOptions {
  onInsert?: (request: Request) => void;
  onUpdate?: (request: Request) => void;
  onDelete?: (id: string) => void;
}

interface UseRealtimeRequestsReturn {
  requests: Request[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  refresh: () => Promise<void>;
}

export function useRealtimeRequests(
  options: UseRealtimeRequestsOptions = {}
): UseRealtimeRequestsReturn {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Store callbacks in ref to avoid re-subscribing on every render
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Initial fetch
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('requests')
        .select('*')
        .order('deadline', { ascending: true });

      if (TEAM_ID) {
        query = query.eq('team_id', TEAM_ID);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup realtime subscription - only runs once on mount
  useEffect(() => {
    fetchRequests();

    // Realtime filter: only listen for this team's changes
    const realtimeFilter = TEAM_ID
      ? `team_id=eq.${TEAM_ID}`
      : undefined;

    // Create realtime channel
    const channel = supabase
      .channel('requests-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'requests',
          ...(realtimeFilter && { filter: realtimeFilter }),
        },
        (payload) => {
          const newRequest = payload.new as Request;
          setRequests((prev) => {
            const newList = [...prev, newRequest].sort(
              (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
            );
            return newList;
          });
          optionsRef.current.onInsert?.(newRequest);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          ...(realtimeFilter && { filter: realtimeFilter }),
        },
        (payload) => {
          const updatedRequest = payload.new as Request;
          setRequests((prev) =>
            prev.map((r) => (r.id === updatedRequest.id ? updatedRequest : r))
          );
          optionsRef.current.onUpdate?.(updatedRequest);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'requests',
          ...(realtimeFilter && { filter: realtimeFilter }),
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setRequests((prev) => prev.filter((r) => r.id !== deletedId));
          optionsRef.current.onDelete?.(deletedId);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchRequests]);

  return {
    requests,
    loading,
    error,
    isConnected,
    refresh: fetchRequests,
  };
}
