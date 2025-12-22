'use client';

import { motion } from 'framer-motion';
import ScreenDisplay, { LCDNumber, LCDLabel, LCDIcon, LCDDivider } from './ScreenDisplay';
import { User } from '@/lib/types';
import { Users } from 'lucide-react';

interface StatsDisplayProps {
  total: number;
  active: number;
  completed: number;
  urgent: number;
  teamMembers: User[];
  selectedMember: string | null; // null = todos
  onMemberSelect: (memberId: string | null) => void;
  requestsByMember: Record<string, number>; // { memberId: count }
}

export default function StatsDisplay({
  total,
  active,
  completed,
  urgent,
  teamMembers,
  selectedMember,
  onMemberSelect,
  requestsByMember,
}: StatsDisplayProps) {
  // Get first letter of name for compact display
  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  // Get short name (first name only, max 6 chars)
  const getShortName = (name: string) => {
    const firstName = name.split(' ')[0];
    return firstName.length > 6 ? firstName.slice(0, 6) : firstName;
  };

  return (
    <ScreenDisplay>
      <div className="flex flex-col gap-3">
        {/* Fila superior - Filtros por persona */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Botón "Todos" */}
            <TeamButton
              label={<Users size={12} />}
              name="TODOS"
              active={selectedMember === null}
              onClick={() => onMemberSelect(null)}
              count={active}
            />

            {/* Botones de miembros del equipo */}
            {teamMembers.map((member) => (
              <TeamButton
                key={member.id}
                label={getInitial(member.name)}
                name={getShortName(member.name).toUpperCase()}
                active={selectedMember === member.id}
                onClick={() => onMemberSelect(member.id)}
                count={requestsByMember[member.id] || 0}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <LCDIcon type="record" active={urgent > 0} />
            <LCDIcon type="play" active={active > 0} />
          </div>
        </div>

        <LCDDivider />

        {/* Stats principales */}
        <div className="grid grid-cols-3 gap-4">
          <StatItem label="TOTAL" value={total} color="cyan" />
          <StatItem label="ACTIVOS" value={active} color="orange" />
          <StatItem label="LISTOS" value={completed} color="green" />
        </div>

        <LCDDivider />

        {/* Fila inferior - Info adicional */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LCDLabel color="orange">URG</LCDLabel>
            <LCDNumber value={urgent.toString().padStart(2, '0')} color="orange" size="sm" />
          </div>

          {/* Mostrar filtro activo */}
          <div className="flex items-center gap-2">
            <LCDLabel color="cyan">
              {selectedMember === null
                ? 'EQUIPO'
                : teamMembers.find(m => m.id === selectedMember)?.name.toUpperCase() || ''
              }
            </LCDLabel>
          </div>

          <div className="flex items-center gap-2">
            <LCDLabel color="cyan">TEAM</LCDLabel>
            <LCDNumber value={teamMembers.length.toString().padStart(2, '0')} color="cyan" size="sm" />
          </div>
        </div>
      </div>
    </ScreenDisplay>
  );
}

function StatItem({
  label,
  value,
  color
}: {
  label: string;
  value: number;
  color: 'cyan' | 'orange' | 'green';
}) {
  return (
    <div className="flex flex-col items-center">
      <LCDLabel color="white">
        {label}
      </LCDLabel>
      <LCDNumber
        value={value.toString().padStart(2, '0')}
        color={color}
        size="lg"
      />
    </div>
  );
}

function TeamButton({
  label,
  name,
  active = false,
  onClick,
  count
}: {
  label: React.ReactNode;
  name: string;
  active?: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="relative flex flex-col items-center gap-0.5"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div
        className="w-8 h-8 flex items-center justify-center rounded-sm text-[11px] font-bold transition-all"
        style={{
          background: active
            ? 'linear-gradient(180deg, #FF5722 0%, #FF4500 100%)'
            : '#2A2A2A',
          color: active ? 'white' : '#666',
          boxShadow: active
            ? '0 0 10px rgba(255,69,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2)'
            : 'inset 0 1px 2px rgba(0,0,0,0.3)',
        }}
      >
        {label}
      </div>
      <span
        className="text-[7px] font-medium tracking-wide"
        style={{ color: active ? '#FF4500' : '#555' }}
      >
        {name}
      </span>
      {/* Badge con contador */}
      {count > 0 && (
        <div
          className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full text-[8px] font-bold"
          style={{
            background: active ? '#00E5FF' : '#444',
            color: active ? '#000' : '#888',
          }}
        >
          {count > 9 ? '9+' : count}
        </div>
      )}
    </motion.button>
  );
}
