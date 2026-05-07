'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getRequiredTeamId } from '@/lib/teamId';
import { Comment } from '@/lib/types';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseCommentsReturn {
  comments: Comment[];
  loading: boolean;
  addComment: (requestId: string, userId: string | null, content: string) => Promise<boolean>;
}

export function useComments(requestId: string | null): UseCommentsReturn {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchComments = useCallback(async () => {
    if (!requestId) {
      setComments([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('request_id', requestId)
        .eq('team_id', getRequiredTeamId())
        .order('created_at', { ascending: true });
      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  // Subscribe to realtime changes on comments for this request
  useEffect(() => {
    if (!requestId) return;

    fetchComments();

    const channel = supabase
      .channel(`comments-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          const newComment = payload.new as Comment;
          setComments((prev) => {
            if (prev.some((c) => c.id === newComment.id)) return prev;
            return [...prev, newComment];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [requestId, fetchComments]);

  const addComment = useCallback(
    async (reqId: string, userId: string | null, content: string): Promise<boolean> => {
      try {
        const { error } = await supabase.from('comments').insert({
          request_id: reqId,
          user_id: userId,
          content: content.trim(),
          team_id: getRequiredTeamId(),
        });

        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Error adding comment:', err);
        return false;
      }
    },
    []
  );

  return { comments, loading, addComment };
}
