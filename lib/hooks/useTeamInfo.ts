'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getRequiredTeamId } from '@/lib/teamId';
import { Team } from '@/lib/types';

interface UseTeamInfoReturn {
  team: Team | null;
  loading: boolean;
}

export function useTeamInfo(): UseTeamInfoReturn {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeam() {
      try {
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .eq('id', getRequiredTeamId())
          .single();

        if (!error && data) {
          setTeam(data as Team);
        }
      } catch (err) {
        console.error('Error fetching team info:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTeam();
  }, []);

  return { team, loading };
}
