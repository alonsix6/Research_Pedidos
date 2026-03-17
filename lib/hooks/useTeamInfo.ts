'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Team } from '@/lib/types';

const TEAM_ID = process.env.NEXT_PUBLIC_TEAM_ID;

interface UseTeamInfoReturn {
  team: Team | null;
  loading: boolean;
}

export function useTeamInfo(): UseTeamInfoReturn {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeam() {
      if (!TEAM_ID) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .eq('id', TEAM_ID)
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
