import React from 'react';

interface DashboardActionModalsProps {
    targetReservationId: string | null;
    actionType: 'APPROVE' | 'SEND_NOTE' | null;
    note: string;
    setNote: (note: string) => void;
    setTargetReservationId: (id: string | null) => void;
    setActionType: (type: 'APPROVE' | 'SEND_NOTE' | null) => void;
    handleTransaction: () => void;
    processing: boolean;
}

export const DashboardActionModals: React.FC<DashboardActionModalsProps> = ({
    targetReservationId,
    actionType,
    note,
    setNote,
    setTargetReservationId,
    setActionType,
    handleTransaction,
    processing
}) => {
    if (!targetReservationId || !actionType) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
            <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 p-6 animate-scale-in">
                <h3 className="text-xl font-bold text-white mb-2 text-center">
                    {actionType === 'APPROVE' ? 'Rezervasyonu Onayla' : 'Takımlara Not Gönder'}
                </h3>

                <p className="text-slate-400 text-sm text-center mb-4">
                    {actionType === 'APPROVE'
                        ? 'Onay mesajıyla birlikte takımlara bir not iletmek ister misiniz?'
                        : 'Maç sahiplerinin göreceği bir not girin.'}
                </p>

                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Örn: Lütfen 15 dk erken gelin (Opsiyonel)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-orange-500 min-h-[100px] mb-4"
                />

                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setTargetReservationId(null);
                            setActionType(null);
                            setNote('');
                        }}
                        className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-600 transition-colors"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={handleTransaction}
                        disabled={processing}
                        className="flex-1 bg-orange-600 text-white font-bold py-3 rounded-xl hover:bg-orange-500 transition-colors shadow-lg shadow-orange-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? 'İşleniyor...' : (actionType === 'APPROVE' ? 'Onayla ve Gönder' : 'Gönder')}
                    </button>
                </div>
            </div>
        </div>
    );
};
