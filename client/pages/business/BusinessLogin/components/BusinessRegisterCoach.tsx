import React from 'react';
import { CoachOverlay } from '../../../../components/Coach/CoachOverlay';
import { markCoachDone } from '../../../../services/coachStorage';

// İşletme login yönlendirme katmanı (agent.md §106 v2): başlık altında tek
// kart, turuncu yol "İşletme Kaydı Oluştur" metnine akar — flip oturunca gösterilir.

interface BusinessRegisterCoachProps {
    onClose: () => void;
}

export const BusinessRegisterCoach: React.FC<BusinessRegisterCoachProps> = ({ onClose }) => {
    const finish = () => {
        markCoachDone('bizreg');
        onClose();
    };

    return (
        <CoachOverlay
            hints={[
                {
                    targetId: 'business-register-link',
                    title: 'İşletmeni Dimli\'ye ekle',
                    body: 'Turuncu yolu takip et, kaydını buradan oluştur.',
                    accent: 'orange',
                },
            ]}
            onDismiss={finish}
            onTargetTap={finish}
        />
    );
};
