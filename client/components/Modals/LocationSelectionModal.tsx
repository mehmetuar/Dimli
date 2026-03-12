import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, ChevronRight, MapPin, Loader2 } from 'lucide-react';
import { locationService, Province, District } from '../../services/locationService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (city: string, district: string) => void;
    initialCity?: string;
    initialDistrict?: string;
    initialStep?: 'CITY' | 'DISTRICT';
}

export const LocationSelectionModal: React.FC<Props> = ({
    isOpen,
    onClose,
    onSelect,
    initialCity,
    initialDistrict,
    initialStep = 'CITY'
}) => {
    const [step, setStep] = useState<'CITY' | 'DISTRICT'>(initialStep);
    const [selectedCity, setSelectedCity] = useState<string>(initialCity || '');
    const [search, setSearch] = useState('');
    const [cities, setCities] = useState<Province[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch cities on mount
    useEffect(() => {
        const fetchCities = async () => {
            try {
                const data = await locationService.getProvinces();
                setCities(data);
            } catch (error) {
                console.error('Error loading cities:', error);
            }
        };
        fetchCities();
    }, []);

    // Sync state with props when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(initialStep);
            setSelectedCity(initialCity || '');
            setSearch('');

            if (initialCity) {
                fetchDistricts(initialCity);
            }
        }
    }, [isOpen, initialCity, initialStep]);

    const fetchDistricts = async (cityName: string) => {
        setIsLoading(true);
        try {
            const data = await locationService.getDistricts(cityName);
            setDistricts(data);
        } catch (error) {
            console.error('Error loading districts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredCities = useMemo(() => {
        return cities.filter(c => c.name.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')));
    }, [search, cities]);

    const filteredDistricts = useMemo(() => {
        return districts.filter(d => d.name.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')));
    }, [search, districts]);

    const handleCitySelect = async (city: string) => {
        setSelectedCity(city);
        setSearch('');
        await fetchDistricts(city);
        setStep('DISTRICT');
    };

    const handleDistrictSelect = (district: string) => {
        onSelect(selectedCity, district);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90" onClick={onClose}>
            <div className="bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-700 overflow-hidden shadow-2xl relative flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
                    <div>
                        <h2 className="font-sport font-bold text-xl text-white italic">
                            {step === 'CITY' ? 'ŞEHİR SEÇİN' : 'İLÇE SEÇİN'}
                        </h2>
                        {step === 'DISTRICT' && <p className="text-orange-500 text-xs font-bold">{selectedCity}</p>}
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-800">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder={step === 'CITY' ? "Şehir ara..." : "İlçe ara..."}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 transition-all text-sm"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar min-h-[300px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-500 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                            <span className="text-sm font-medium">Yükleniyor...</span>
                        </div>
                    ) : step === 'CITY' ? (
                        filteredCities.map(city => (
                            <button
                                key={city.id}
                                onClick={() => handleCitySelect(city.name)}
                                className="w-full p-4 rounded-xl flex items-center justify-between hover:bg-slate-800 transition-all group border border-transparent hover:border-slate-700"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-white">{city.name}</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white" />
                            </button>
                        ))
                    ) : (
                        <>
                            <button
                                onClick={() => setStep('CITY')}
                                className="w-full p-3 text-xs font-bold text-slate-500 hover:text-orange-500 flex items-center gap-1 mb-2"
                            >
                                ← Şehir Değiştir
                            </button>
                            {filteredDistricts.map(district => (
                                <button
                                    key={district.id}
                                    onClick={() => handleDistrictSelect(district.name)}
                                    className="w-full p-4 rounded-xl flex items-center justify-between hover:bg-slate-800 transition-all group border border-transparent hover:border-slate-700"
                                >
                                    <span className="font-bold text-white">{district.name}</span>
                                    {initialDistrict === district.name && initialCity === selectedCity && (
                                        <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                                    )}
                                </button>
                            ))}
                        </>
                    )}

                    {!isLoading && (step === 'CITY' ? filteredCities.length : filteredDistricts.length) === 0 && (
                        <div className="p-8 text-center text-slate-500 italic text-sm">
                            Sonuç bulunamadı...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
