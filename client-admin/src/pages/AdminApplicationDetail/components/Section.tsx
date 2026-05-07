import React from 'react';

interface SectionProps {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, icon, children }) => (
    <div className="bg-[#1e2d47] border border-slate-700/50 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-orange-500 rounded-full" />
            {icon && <span className="text-orange-400">{icon}</span>}
            <h3 className="font-black text-[#dde8f5] text-xs uppercase tracking-wider">{title}</h3>
        </div>
        {children}
    </div>
);

export default Section;
