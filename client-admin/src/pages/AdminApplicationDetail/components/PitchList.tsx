import React from 'react';
import { IconPitch } from '../../../components/Icons';
import { EditPitch } from '../types';
import Section from './Section';
import PitchCard from './PitchCard';

interface PitchListProps {
    pitches: any[];
    editPitches: EditPitch[];
    editMode: boolean;
    updatePitch: (pitchId: string, changes: Partial<EditPitch>) => void;
}

const PitchList: React.FC<PitchListProps> = ({ pitches, editPitches, editMode, updatePitch }) => {
    if (!pitches || pitches.length === 0) return null;

    return (
        <Section title={`Sahalar (${pitches.length})`} icon={<IconPitch size={13} />}>
            <div className="space-y-5">
                {pitches.map((pitch: any, i: number) => (
                    <PitchCard
                        key={pitch.id}
                        pitch={pitch}
                        editPitch={editPitches.find(p => p.id === pitch.id)}
                        editMode={editMode}
                        index={i}
                        updatePitch={updatePitch}
                    />
                ))}
            </div>
        </Section>
    );
};

export default PitchList;
