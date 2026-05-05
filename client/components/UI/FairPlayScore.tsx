
import React from 'react';
import { Star } from 'lucide-react';

interface Props {
  score: number;
  count?: number;
}

export const FairPlayScore: React.FC<Props> = ({ score, count }) => {
  return (
    <div className="flex items-center gap-1">
      <Star className="w-4 h-4 text-green-500 fill-green-500" />
      <span className="text-white font-black text-xl">{score.toFixed(1)}</span>
      {count != null && count > 0 && (
        <span className="text-slate-500 text-xs font-semibold">({count})</span>
      )}
    </div>
  );
};
