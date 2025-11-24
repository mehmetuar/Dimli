
import React, { useState } from 'react';
import { MOCK_NOTIFICATIONS, MOCK_OFFERS } from '../constants';
import { Bell, Check, X, Calendar, Shield, Info, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Notifications: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'OFFERS'>('ALL');
  const navigate = useNavigate();

  const handleAcceptOffer = (id: string) => {
      // In a real app, API call here
      alert('Teklif kabul edildi! Sohbet başlatılıyor...');
      navigate('/chat');
  };

  const handleRejectOffer = (id: string) => {
      alert('Teklif reddedildi.');
  };

  const filteredList = activeTab === 'ALL' 
    ? MOCK_NOTIFICATIONS 
    : MOCK_NOTIFICATIONS.filter(n => n.type === 'OFFER');

  return (
    <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto min-h-screen">
       <header className="mb-6">
          <h1 className="font-sport font-black text-4xl text-white uppercase italic tracking-tighter">
             BİLDİRİMLER
          </h1>
       </header>

       {/* Tab Switcher */}
       <div className="flex p-1 bg-slate-800 rounded-xl mb-6 border border-slate-700">
          <button 
            onClick={() => setActiveTab('ALL')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'ALL' ? 'bg-turf-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            HEPSİ
          </button>
          <button 
            onClick={() => setActiveTab('OFFERS')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'OFFERS' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            TEKLİFLER
          </button>
       </div>

       <div className="space-y-4">
          {filteredList.map(item => {
             // If it's an offer notification, let's find the offer details to show more context
             const relatedOffer = item.type === 'OFFER' && item.relatedOfferId 
                ? MOCK_OFFERS.find(o => o.id === item.relatedOfferId) 
                : null;

             return (
                <div key={item.id} className={`relative bg-slate-800 rounded-2xl border overflow-hidden transition-all ${!item.read ? 'border-turf-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-slate-700 opacity-90'}`}>
                   
                   {/* Left Accent Bar */}
                   <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.type === 'OFFER' ? 'bg-blue-500' : item.type === 'SYSTEM' ? 'bg-turf-500' : 'bg-yellow-500'}`}></div>

                   <div className="p-4 pl-6">
                      <div className="flex justify-between items-start mb-1">
                         <h3 className="font-bold text-white text-lg">{item.title}</h3>
                         <span className="text-[10px] font-bold text-slate-500 uppercase">{item.timestamp}</span>
                      </div>
                      
                      <p className="text-sm text-slate-300 mb-3 leading-relaxed">{item.message}</p>

                      {/* Offer Specific Actions */}
                      {item.type === 'OFFER' && relatedOffer && (
                         <div className="mt-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
                               <Shield className="w-3 h-3" /> {relatedOffer.fromTeamName}
                            </div>
                            <p className="text-xs text-white italic mb-3">"{relatedOffer.note}"</p>
                            <div className="flex gap-2">
                               <button 
                                 onClick={() => handleRejectOffer(relatedOffer.id)}
                                 className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-900/50 hover:text-red-400 transition-colors"
                               >
                                  <X className="w-3 h-3" /> Reddet
                               </button>
                               <button 
                                 onClick={() => handleAcceptOffer(relatedOffer.id)}
                                 className="flex-1 py-2 bg-turf-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20"
                               >
                                  <Check className="w-3 h-3" /> Kabul Et
                               </button>
                            </div>
                         </div>
                      )}

                      {/* Generic Link Action */}
                      {item.actionLink && (
                         <button 
                            onClick={() => navigate(item.actionLink!)}
                            className="mt-2 text-turf-500 text-xs font-bold flex items-center gap-1 hover:underline"
                         >
                            Görüntüle <ChevronRight className="w-3 h-3" />
                         </button>
                      )}
                   </div>
                </div>
             );
          })}

          {filteredList.length === 0 && (
             <div className="text-center py-12 opacity-50">
                <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Şu an yeni bildirim yok.</p>
             </div>
          )}
       </div>
    </div>
  );
};
