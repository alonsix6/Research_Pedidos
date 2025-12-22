'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';

interface UseTeamMembersReturn {
  members: User[];
  loading: boolean;
  error: string | null;
}

export function useTeamMembers(): UseTeamMembersReturn {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMembers() {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .order('name', { ascending: true });

        if (fetchError) throw fetchError;
        setMembers(data || []);
      } catch (err) {
        console.error('Error fetching team members:', err);
        setError('Error al cargar el equipo');
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, []);

  return { members, loading, error };
}
