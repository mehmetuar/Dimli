import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { openStoreSubscriptions } from '../utils';

interface StoreCancelPromptModalProps {
    visible: boolean;
    onClose: () => void;
}

// Davet kodu uygulandıktan sonra: mağaza aboneliği programatik iptal edilemez,
// kullanıcı store abonelik sayfasından kendisi iptal etmeli. İptal edilmese bile
// sistemsel zarar yok (webhook guard'ı complimentary'yi korur) — yalnız kullanıcı
// gereksiz ödemeye devam eder.
export const StoreCancelPromptModal: React.FC<StoreCancelPromptModalProps> = ({ visible, onClose }) => {
    if (!visible) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-sm rounded-3xl border border-amber-500/20 shadow-2xl overflow-hidden">
                <div className="px-6 pt-6 pb-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-amber-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Mağaza Aboneliğini İptal Et</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Davet kodun uygulandı. Mağaza aboneliğinin bir sonraki dönemde
                        yenilenmemesi için App Store / Google Play abonelik sayfasından iptal
                        etmen gerekir.
                    </p>
                </div>
                <div className="flex gap-3 px-6 pt-2 pb-6">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                        Daha Sonra
                    </button>
                    <button
                        onClick={() => { openStoreSubscriptions(); onClose(); }}
                        className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                        İptal Et
                    </button>
                </div>
            </div>
        </div>
    );
};
