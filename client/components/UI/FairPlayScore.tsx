
import React from 'react';
import { Star } from 'lucide-react';

interface Props {
  score: number;
  count?: number;
  className?: string;
}

export const FairPlayScore: React.FC<Props> = ({ score, count, className }) => {
  return (
    <div className={`flex items-center gap-0.5 xs:gap-1${className ? ` ${className}` : ''}`}>
      <Star className="w-3 h-3 xs:w-4 xs:h-4 text-green-500 fill-green-500 shrink-0" />
      <span className="text-white font-black text-sm xs:text-base sm:text-xl">{score.toFixed(1)}</span>
      {count != null && count > 0 && (
        <span className="text-slate-500 text-[10px] xs:text-xs font-semibold">({count})</span>
      )}
    </div>
  );
};
