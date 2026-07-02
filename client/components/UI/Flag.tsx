import React from 'react';

interface FlagProps {
  /** ISO 3166-1 alpha-2 kod (örn. 'TR'). Boşsa 'TR' varsayılır. */
  code?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Gömülü (offline) ülke bayrağı — flag-icons SVG (internet gerektirmez).
 * CSS `index.tsx`'te bir kez import edilir (`flag-icons/css/flag-icons.min.css`).
 * Varsayılan boyut mevcut kart bayrağıyla aynı: 1.5rem × 1rem (w-6 h-4).
 */
export const Flag: React.FC<FlagProps> = ({ code, className = '', style }) => {
  const cc = (code || 'TR').toLowerCase();
  return (
    <span
      className={`fi fi-${cc} rounded shadow ${className}`}
      style={{ width: '1.5rem', height: '1rem', backgroundSize: 'cover', display: 'inline-block', ...style }}
      role="img"
      aria-label={(code || 'TR').toUpperCase()}
    />
  );
};
