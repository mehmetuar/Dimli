import React from 'react';
import { Goal } from 'lucide-react';
import { BusinessNavbar } from '../../../components/Business/BusinessNavbar';
import { BusinessLoadingSpinner } from '../../../components/Business/BusinessLoadingSpinner';

// Hooks
import { useBusinessPitchList } from './hooks/useBusinessPitchList';

// Components
import { PitchListHeader } from './components/PitchListHeader';
import { PitchListItem } from './components/PitchListItem';

export const BusinessPitchList: React.FC = () => {
    const {
        navigate,
        loading,
        pitches,
        subscription,
    } = useBusinessPitchList();

    if (loading) return <BusinessLoadingSpinner fullScreen />;

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-24 relative">
            <PitchListHeader
                navigate={navigate}
                pitchCount={pitches.length}
                subscription={subscription}
            />

            <div className="p-4 space-y-3">
                {pitches.map((pitch) => (
                    <PitchListItem
                        key={pitch.id}
                        pitch={pitch}
                        onClick={() => navigate(`/business/settings/pitches/${pitch.id}`)}
                    />
                ))}

                {pitches.length === 0 && (
                    <div className="text-center py-10 text-slate-500">
                        <Goal className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Henüz saha oluşturulmamış.</p>
                        <p className="text-xs text-slate-600 mt-1">Sahalar kayıt sırasında abonelik planınıza göre oluşturulur.</p>
                    </div>
                )}
            </div>

            <BusinessNavbar />
        </div>
    );
};
