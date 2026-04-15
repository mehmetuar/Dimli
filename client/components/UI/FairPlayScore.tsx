
import React from 'react';
import { Star } from 'lucide-react';

interface Props {
  score: number;
  count?: number;
}

export const FairPlayScore: React.FC<Props> = ({ score, count }) => {
  return (
    <div className="flex items-center gap-1 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
      <span className="text-[10px] font-bold text-indigo-200">{score.toFixed(1)}</span>
      {count != null && count > 0 && (
        <span className="text-[9px] text-indigo-400">({count})</span>
      )}
      <span className="text-[9px] text-indigo-400 ml-0.5 uppercase font-semibold">Fair Play</span>
    </div>
  );
};
