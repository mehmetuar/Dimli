import React from 'react';
import { getFacilityIcon } from '../../../components/Icons';
import { parseFacilities } from '../types';

interface FacilityChipsProps {
    facilities: string[] | string | null | undefined;
}

const FacilityChips: React.FC<FacilityChipsProps> = ({ facilities }) => {
    const list = parseFacilities(facilities);
    if (list.length === 0) return <p className="text-slate-500 text-xs italic">İmkan belirtilmemiş</p>;
    return (
        <div className="flex flex-wrap gap-1.5 mt-1">
            {list.map(facility => {
                const FIcon = getFacilityIcon(facility);
                return (
                    <span key={facility} className="inline-flex items-center gap-1.5 bg-[#253352] border border-slate-600/50 text-slate-200 text-xs font-medium px-2.5 py-1 rounded-full">
                        <FIcon size={12} className="text-orange-400 shrink-0" />
                        {facility}
                    </span>
                );
            })}
        </div>
    );
};

export default FacilityChips;
