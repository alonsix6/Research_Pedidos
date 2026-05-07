'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Request } from '@/lib/types';

/**
 * Aviso de "edición concurrente" para modales/paneles que tienen abierta una
 * fila en particular. Mientras el modal/panel está abierto, escuchamos UPDATE
 * realtime sobre `requests.id=eq.{requestId}`. Si llega un evento cuyo
 * `updated_at` es POSTERIOR al snapshot que el modal capturó al abrir, ese
 * formulario muestra contenido viejo: notificamos al consumer.
 *
 * El consumer decide qué UI mostrar (banner, dialog, etc) y si "Recargar"
 * (fetch fresh + reset form) o "Continuar" (asumir el riesgo, va a chocar
 * con `updateRequestWithConflictCheck` al guardar y ahí mostramos el
 * conflict).
 *
 * @param requestId  id que el modal/panel está editando, o null si está cerrado
 * @param snapshotUpdatedAt updated_at de la fila en el momento de abrir
 */
export function useStaleNotice(requestId: string | null, snapshotUpdatedAt: string | null) {
  const [latestUpdatedAt, setLatestUpdatedAt] = useState<string | null>(null);
  const [latestRow, setLatestRow] = useState<Request | null>(null);

  useEffect(() => {
    if (!requestId || !snapshotUpdatedAt) {
      setLatestUpdatedAt(null);
      setLatestRow(null);
      return;
    }

    const channel = supabase
      .channel(`stale-notice-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          const row = payload.new as Request;
          if (row.updated_at && row.updated_at > snapshotUpdatedAt) {
            setLatestUpdatedAt(row.updated_at);
            setLatestRow(row);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, snapshotUpdatedAt]);

  const isStale = latestUpdatedAt !== null;

  function dismiss() {
    setLatestUpdatedAt(null);
    setLatestRow(null);
  }

  return { isStale, latestRow, dismiss };
}
