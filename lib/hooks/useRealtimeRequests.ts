'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Request } from '@/lib/types';
import { RealtimeChannel } from '@supabase/supabase-js';

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

      const { data, error: fetchError } = await supabase
        .from('requests')
        .select('*')
        .order('deadline', { ascending: true });

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

    // Create realtime channel
    const channel = supabase
      .channel('requests-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'requests',
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
