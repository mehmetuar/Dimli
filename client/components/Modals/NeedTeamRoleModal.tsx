import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, UserPlus, X, Lock } from 'lucide-react';
import { useModalBodyClass } from '../../utils/useModalBodyClass';

interface NeedTeamRoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    reason: 'no_team' | 'no_role';
}

export const NeedTeamRoleModal: React.FC<NeedTeamRoleModalProps> = ({ isOpen, onClose, reason }) => {
    const navigate = useNavigate();
    useModalBodyClass(isOpen);

    if (!isOpen) return null;

    const handleCreateTeam = () => {
        onClose();
        navigate('/team', { state: { openModal: 'createTeam' } });
    };

    const handleJoinTeam = () => {
        onClose();
        navigate('/team', { state: { openModal: 'joinTeam' } });
    };

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-black/75 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-700/60 shadow-2xl p-6"
                onClick={e => e.stopPropagation()}
            >
                {/* Icon + Close */}
                <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center">
                        <Lock className="w-6 h-6 text-amber-400" />
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-slate-800 text-slate-500 hover:text-white active:scale-90 transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {reason === 'no_team' ? (
                    <>
                        <h3 className="text-white font-black text-lg uppercase italic tracking-wide mb-1">
                            Takım Gerekli
                        </h3>
                        <p className="text-slate-400 text-sm mb-5">
                            Maç ilanı oluşturmak için bir takıma üye olman veya kendi takımını kurman gerekiyor.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCreateTeam}
                                className="flex-1 flex items-center justify-center gap-2 bg-turf-600 text-white font-black text-sm uppercase italic py-3.5 rounded-xl active:scale-95 transition-all shadow-lg shadow-turf-600/20"
                            >
                                <Shield className="w-4 h-4" />
                                Takım Kur
                            </button>
                            <button
                                onClick={handleJoinTeam}
                                className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-slate-200 font-bold text-sm py-3.5 rounded-xl active:scale-95 transition-all border border-slate-700"
                            >
                                <UserPlus className="w-4 h-4" />
                                Takıma Katıl
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <h3 className="text-white font-black text-lg uppercase italic tracking-wide mb-1">
                            Yetki Gerekli
                        </h3>
                        <p className="text-slate-400 text-sm mb-5">
                            Maç ilanı yalnızca takımın <span className="text-white font-bold">kaptanı</span> veya <span className="text-white font-bold">yardımcı kaptanı</span> tarafından oluşturulabilir.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full bg-slate-800 text-slate-300 font-bold text-sm py-3.5 rounded-xl active:scale-95 transition-all border border-slate-700"
                        >
                            Tamam
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
