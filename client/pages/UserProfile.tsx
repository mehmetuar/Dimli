import React, { useState, useEffect } from 'react';
import { Settings, LogOut, ChevronRight, User, MapPin, Shield } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Geolocation } from '@capacitor/geolocation';
import api from '../services/api';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { PlayerDetailModal } from '../components/PlayerDetailModal';

export const UserProfile: React.FC = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Fetch User Data on Mount
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/users/me');
                setCurrentUser(response.data);
            } catch (error) {
                console.error("Failed to fetch user profile", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUser();
    }, []);

    // Auto-hide success/error messages
    useEffect(() => {
        if (successMessage || errorMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage('');
                setErrorMessage('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, errorMessage]);

    const handleUpdateLocation = async (isAuto = false) => {
        try {
            if (!isAuto) setIsLoading(true);

            const permission = await Geolocation.checkPermissions();
            if (isAuto && permission.location === 'denied') return;

            if (permission.location !== 'granted') {
                const request = await Geolocation.requestPermissions();
                if (request.location !== 'granted') {
                    if (!isAuto) setErrorMessage('Konum izni reddedildi.');
                    if (!isAuto) setIsLoading(false);
                    return;
                }
            }

            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 3000
            });

            const { latitude, longitude } = position.coords;
            const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const address = response.data.address;
            const locationName = address.district || address.city || address.town || address.state || 'Bilinmeyen Konum';

            const updateRes = await api.patch('/users/me', { location: locationName });
            setCurrentUser(updateRes.data);
            setSuccessMessage(`Konum güncellendi: ${locationName}`);
        } catch (error) {
            console.error('Location update failed:', error);
            if (!isAuto) setErrorMessage('Konum alınamadı.');
        } finally {
            if (!isAuto) setIsLoading(false);
        }
    };

    // Auto-request location on mount
    useEffect(() => {
        if (currentUser && !currentUser.location) {
            handleUpdateLocation(true);
        }
    }, [currentUser?.id]);

    const calculateAge = (birthDate: string | Date) => {
        if (!birthDate) return '-';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    if (isLoading) {
        return <LoadingSpinner fullScreen text="Profil Yükleniyor..." />;
    }

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-pitch flex flex-col items-center justify-center text-white gap-4">
                <p>Kullanıcı bulunamadı. Lütfen giriş yapın.</p>
                <button
                    onClick={() => navigate('/login')}
                    className="px-6 py-3 bg-turf-600 text-white font-bold rounded-xl hover:bg-turf-500 transition-colors"
                >
                    Giriş Yap
                </button>
            </div>
        );
    }

    return (
        <>
            {/* Profile Settings Menu */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
                    <div className="bg-slate-800 w-full max-w-md rounded-t-3xl border-t border-slate-700 shadow-2xl z-[70] animate-slide-up pb-safe-bottom">
                        <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setIsMenuOpen(false)}>
                            <div className="w-12 h-1.5 bg-slate-600 rounded-full"></div>
                        </div>
                        <div className="p-6 border-b border-slate-700">
                            <h3 className="text-white font-bold text-xl flex items-center gap-2">
                                <User className="w-6 h-6 text-turf-500" />
                                Profil Ayarları
                            </h3>
                            <p className="text-slate-400 text-sm mt-1">Hesabını ve tercihlerini yönet</p>
                        </div>
                        <div className="p-4 space-y-2">
                            <button
                                onClick={() => { setIsMenuOpen(false); navigate('/settings/profile'); }}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-700/50 hover:bg-slate-700 text-white transition-all active:scale-95"
                            >
                                <div className="bg-blue-500/20 p-2 rounded-full text-blue-400">
                                    <Settings className="w-6 h-6" />
                                </div>
                                <div className="text-left flex-1">
                                    <div className="font-bold text-base">Profil Ayarları</div>
                                    <div className="text-xs text-slate-400">Bilgilerini güncelle</div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-500" />
                            </button>
                            <button
                                onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all active:scale-95 mt-4"
                            >
                                <div className="bg-red-500/20 p-2 rounded-full text-red-400">
                                    <LogOut className="w-6 h-6" />
                                </div>
                                <div className="text-left flex-1">
                                    <div className="font-bold text-base">Çıkış Yap</div>
                                    <div className="text-xs text-red-400/70">Oturumu sonlandır</div>
                                </div>
                            </button>
                        </div>
                        <div className="p-4 pt-0">
                            <button onClick={() => setIsMenuOpen(false)} className="w-full py-4 text-center text-slate-500 font-bold hover:text-white transition-colors">Vazgeç</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Player Card */}
            <div className="animate-fade-in">
                <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    <div className="relative z-10 p-6 flex flex-col items-center">
                        <div
                            className="w-32 h-32 rounded-full p-1 bg-gradient-to-r from-turf-500 to-blue-500 mb-4 relative group-avatar cursor-pointer"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <img
                                src={'https://picsum.photos/100/100?random=1'}
                                alt="Profile"
                                className="w-full h-full rounded-full object-cover border-4 border-slate-900"
                            />
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(true); }}
                                className="absolute -right-2 -bottom-2 bg-slate-800 text-white p-2.5 rounded-full border border-slate-600 shadow-lg hover:bg-slate-700 hover:scale-110 transition-all z-20"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        </div>

                        <h2
                            className="font-sport font-bold text-4xl text-white uppercase italic tracking-wide mb-6 cursor-pointer hover:text-turf-400 transition-colors"
                            onClick={() => setIsModalOpen(true)}
                        >
                            {currentUser.full_name || currentUser.username}
                        </h2>

                        <div className="grid grid-cols-2 gap-3 w-full">
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-1">
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">YAŞ</span>
                                <span className="text-white font-sport text-xl font-bold">{calculateAge(currentUser.birthDate)}</span>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-1 relative group">
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">KONUM</span>
                                <span className="text-white font-sport text-lg font-bold truncate max-w-full">{currentUser.location || 'İstanbul'}</span>
                                <button onClick={() => handleUpdateLocation(false)} className="absolute top-1 right-1 text-turf-500 hover:text-white transition-colors">
                                    <MapPin className="w-3 h-3" />
                                </button>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-1 col-span-2">
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">MEVKİ</span>
                                <span className="text-turf-400 font-sport text-2xl font-bold">{currentUser.position || '-'}</span>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-1">
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">YAN MEVKİ</span>
                                <span className="text-white font-sport text-lg font-bold">{currentUser.secondaryPosition || '-'}</span>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-1">
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">AYAK</span>
                                <span className="text-white font-sport text-xl font-bold uppercase">{currentUser.foot || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Preview Modal */}
            <PlayerDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                player={{
                    id: currentUser.id,
                    name: currentUser.full_name || currentUser.username,
                    position: currentUser.position || '-',
                    secondaryPosition: currentUser.secondaryPosition,
                    location: currentUser.location,
                    birthDate: currentUser.birthDate,
                    foot: currentUser.foot,
                    isJoker: false,
                    avatarUrl: 'https://picsum.photos/100/100?random=1',
                    favoritePitchIds: currentUser.favoriteBusinessIds || [],
                    sharesFee: false // Not shown for isMe anyway
                } as any}
                isMe={true}
                onEdit={() => navigate('/settings/profile')}
            />
        </>
    );
};
