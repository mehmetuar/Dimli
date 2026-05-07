import React from 'react';
import { IconUser } from '../../../components/Icons';
import Section from './Section';
import Row from './Row';

interface OwnerInfoSectionProps {
    editOwner: Record<string, string>;
    setEditOwner: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
    editMode: boolean;
}

const OwnerInfoSection: React.FC<OwnerInfoSectionProps> = ({ editOwner, setEditOwner, editMode }) => (
    <Section title="Yetkili Bilgileri" icon={<IconUser size={13} />}>
        <Row label="Ad Soyad" value={editOwner.fullName} editMode={editMode} onChange={v => setEditOwner(p => ({ ...p, fullName: v }))} />
        <Row label="E-posta"  value={editOwner.email}    editMode={editMode} onChange={v => setEditOwner(p => ({ ...p, email: v }))}    type="email" />
        <Row label="Telefon"  value={editOwner.phone}    editMode={editMode} onChange={v => setEditOwner(p => ({ ...p, phone: v }))} />
    </Section>
);

export default OwnerInfoSection;
