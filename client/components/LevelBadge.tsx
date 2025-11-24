import React from 'react';
import { SkillLevel } from '../types';

interface Props {
  level: SkillLevel;
}

export const LevelBadge: React.FC<Props> = ({ level }) => {
  let colorClass = '';

  switch (level) {
    case SkillLevel.BEGINNER:
      colorClass = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      break;
    case SkillLevel.INTERMEDIATE:
      colorClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      break;
    case SkillLevel.ADVANCED:
      colorClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      break;
    case SkillLevel.EXPERT:
      colorClass = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      break;
    default:
      colorClass = 'bg-gray-100 text-gray-800';
  }

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
      {level}
    </span>
  );
};