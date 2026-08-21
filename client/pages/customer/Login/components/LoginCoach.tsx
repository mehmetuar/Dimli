import React from 'react';
import { CoachOverlay } from '../../../../components/Coach/CoachOverlay';
import { markCoachDone } from '../../../../services/coachStorage';

// Müşteri login yönlendirme katmanı (agent.md §106 v2): logo altında yan yana
// iki kart; yeşil yol "Kayıt Ol" metnine, turuncu yol geçiş butonuna akar.
// Her aksiyon (hedefe dokunma / boş alana dokunarak atlama) bayrağı yazar.

interface LoginCoachProps {
    onClose: () => void;
}

export const LoginCoach: React.FC<LoginCoachProps> = ({ onClose }) => {
    const finish = () => {
        markCoachDone('login');
        onClose();
    };

    return (
        <CoachOverlay
            hints={[
                {
                    targetId: 'register-link',
                    title: 'Oyuncu musun?',
                    body: 'Yeşil yolu takip et, hemen kayıt ol.',
                    accent: 'turf',
                },
                {
                    targetId: 'business-switch',
                    title: 'İşletmeci misin?',
                    body: 'Turuncu yolu takip et, işletme girişine geç.',
                    accent: 'orange',
                },
            ]}
            onDismiss={finish}
            onTargetTap={finish}
        />
    );
};
