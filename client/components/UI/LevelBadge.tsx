import React from 'react';

const LEVEL_MAP: Record<string, { label: string; colorClass: string }> = {
  BEGINNER: { label: 'Başlangıç', colorClass: 'bg-green-500/20 text-green-400 border-green-500/40' },
  INTERMEDIATE: { label: 'Orta', colorClass: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  ADVANCED: { label: 'İleri', colorClass: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
  PRO: { label: 'Profesyonel', colorClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
  // Legacy support
  EXPERT: { label: 'Uzman', colorClass: 'bg-red-500/20 text-red-400 border-red-500/40' },
};

interface Props {
  level?: string;
}

export const LevelBadge: React.FC<Props> = ({ level }) => {
  const entry = level ? LEVEL_MAP[level.toUpperCase()] : undefined;
  const label = entry?.label ?? (level || '—');
  const colorClass = entry?.colorClass ?? 'bg-slate-700 text-slate-400 border-slate-600';

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${colorClass}`}>
      {label}
    </span>
  );
};