'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';

const TEAM_ID = process.env.NEXT_PUBLIC_TEAM_ID;

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
        let query = supabase
          .from('users')
          .select('*')
          .order('name', { ascending: true });

        if (TEAM_ID) {
          query = query.eq('team_id', TEAM_ID);
        }

        const { data, error: fetchError } = await query;

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
