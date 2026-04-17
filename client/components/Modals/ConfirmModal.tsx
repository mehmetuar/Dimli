import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
    accentColor?: 'green' | 'orange';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Onayla',
    cancelText = 'İptal',
    isDangerous = false,
    accentColor = 'green',
}) => {
    const isOrange = !isDangerous && accentColor === 'orange';
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 overflow-hidden relative shadow-2xl animate-scale-in">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-slate-900/50 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6">
                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                        isDangerous ? 'bg-red-500/10' : isOrange ? 'bg-orange-500/10' : 'bg-turf-500/10'
                    }`}>
                        <AlertTriangle className={`w-8 h-8 ${
                            isDangerous ? 'text-red-500' : isOrange ? 'text-orange-500' : 'text-turf-500'
                        }`} />
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-white text-center mb-2">
                        {title}
                    </h3>

                    {/* Message */}
                    <p className="text-slate-300 text-center mb-6">
                        {message}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-600 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={handleConfirm}
                            className={`flex-1 font-bold py-3 rounded-xl transition-colors shadow-lg ${
                                isDangerous
                                    ? 'bg-red-600 text-white hover:bg-red-500 shadow-red-600/20'
                                    : isOrange
                                        ? 'bg-orange-600 text-white hover:bg-orange-500 shadow-orange-600/20'
                                        : 'bg-turf-600 text-white hover:bg-turf-500 shadow-turf-600/20'
                            }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
