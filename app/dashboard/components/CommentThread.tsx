'use client';

import { useState, useRef, useEffect } from 'react';
import { useComments } from '@/lib/hooks/useComments';
import { formatLimaDateTime } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, Loader2 } from 'lucide-react';

interface CommentThreadProps {
  requestId: string;
  currentUserId: string | null;
  teamMembers?: Array<{ id: string; name: string }>;
}

export default function CommentThread({
  requestId,
  currentUserId,
  teamMembers = [],
}: CommentThreadProps) {
  const { comments, loading, addComment } = useComments(requestId);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getUserName = (userId: string | null) => {
    if (!userId) return 'Sistema';
    const member = teamMembers.find((m) => m.id === userId);
    return member?.name || 'Usuario';
  };

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || sending) return;

    setSending(true);
    const success = await addComment(requestId, currentUserId, newComment);
    if (success) {
      setNewComment('');
    }
    setSending(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Comments list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 pr-1"
        style={{ maxHeight: '200px' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={14} className="animate-spin text-[#666]" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-4">
            <MessageSquare size={16} className="mx-auto mb-2 text-[#666]" />
            <p className="text-[10px] text-[#666]">Sin comentarios</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {comments.map((comment) => {
              const isOwn = comment.user_id === currentUserId;
              return (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-2 rounded ${isOwn ? 'ml-4' : 'mr-4'}`}
                  style={{
                    background: isOwn ? 'rgba(0, 229, 255, 0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isOwn ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[9px] font-medium uppercase tracking-wider"
                      style={{ color: isOwn ? '#00E5FF' : '#949494' }}
                    >
                      {getUserName(comment.user_id)}
                    </span>
                    <span className="text-[8px] text-[#555]">
                      {formatLimaDateTime(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#C0C0C0] leading-relaxed whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 mt-2 pt-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Escribe un comentario..."
          className="flex-1 input-lcd text-[11px]"
          disabled={sending}
        />
        <motion.button
          type="submit"
          disabled={!newComment.trim() || sending}
          className="w-8 h-8 flex items-center justify-center rounded-sm disabled:opacity-30"
          style={{
            background: 'linear-gradient(180deg, #00E5FF 0%, #00BCD4 100%)',
            boxShadow: '0 2px 0 #00838F, inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95, y: 1 }}
        >
          {sending ? (
            <Loader2 size={12} className="animate-spin text-white" />
          ) : (
            <Send size={12} className="text-white" />
          )}
        </motion.button>
      </form>
    </div>
  );
}
