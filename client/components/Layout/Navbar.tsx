
import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Search, Zap, MessageSquare, User, Bell, Trophy } from 'lucide-react';
import api from '../../services/api';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);
  const isLoggedIn = !!localStorage.getItem('token');
  const showBell = true;
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [unreadChatCount, setUnreadChatCount] = React.useState(0);

  React.useEffect(() => {
    if (!isLoggedIn) return;

    const fetchCounts = async () => {
      try {
        const [notifRes, chatRes] = await Promise.all([
          api.get('/notifications/unread-count'),
          api.get('/chat/unread-count')
        ]);
        setUnreadCount(notifRes.data.count);
        setUnreadChatCount(chatRes.data);
      } catch (error) {
        console.error('Failed to fetch counts', error);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 5000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  if (isAuthPage) {
    return null;
  }

  const handleNotificationClick = () => {
    if (location.pathname === '/notifications') {
      navigate(-1); // Go back if already on notifications
    } else {
      navigate('/notifications');
    }
  };

  // Active nav: scale-110 only — removed -translate-y-1 (Android transform stacking bug)
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center w-full h-full transition-all duration-300 relative group ${isActive
      ? 'text-turf-500 scale-110'
      : 'text-gray-400 hover:text-gray-200'
    }`;

  return (
    <>
      {/* Desktop Logo (Top Left Absolute) */}
      <div className="hidden md:flex fixed top-6 left-8 items-center gap-2 z-50 cursor-pointer" onClick={() => navigate('/')}>
        <img src="/icon.png" alt="DIMLİ" className="h-10 w-auto object-contain" />
      </div>

      {/* Notification Bell (Top Right - Visible Mobile & Desktop) - Conditioned */}
      {showBell && isLoggedIn && location.pathname !== '/chat' && location.pathname !== '/team' && (
        <div className="fixed top-bell-safe right-4 z-50">
          <button
            onClick={handleNotificationClick}
            className={`relative p-2 rounded-full border transition-all group ${location.pathname === '/notifications'
              ? 'bg-turf-600 border-turf-400 text-white shadow-neon'
              : 'bg-slate-800/80 border-slate-700 text-white hover:border-turf-500'
              }`}
          >
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && location.pathname !== '/notifications' && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 animate-pulse">
                {unreadCount}
              </div>
            )}
          </button>
        </div>
      )}

      {/* Bottom Navigation Bar — solid bg, no backdrop-blur (Android WebView compat) */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-pitch-surface border-t border-white/10 rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] z-50 pb-safe-bottom box-content">
        <div className="flex justify-around items-center h-full px-2">

          <NavLink to="/" className={navClass}>
            {({ isActive }) => (
              <>
                <Search className={`w-6 h-6 mb-0.5 ${isActive ? 'stroke-[3px]' : ''}`} />
                {isActive && <span className="absolute -bottom-2 w-1 h-1 bg-turf-500 rounded-full shadow-neon"></span>}
              </>
            )}
          </NavLink>

          <NavLink to="/pitches" className={navClass}>
            {({ isActive }) => (
              <>
                <Trophy className={`w-6 h-6 mb-0.5 ${isActive ? 'stroke-[3px]' : ''}`} />
                {isActive && <span className="absolute -bottom-2 w-1 h-1 bg-turf-500 rounded-full shadow-neon"></span>}
              </>
            )}
          </NavLink>

          {/* Center Action Button (Joker) — marginTop replaces -top-6 class (Android transform fix) */}
          <NavLink to="/jokers" className="relative flex items-center justify-center" style={{ marginTop: '-24px' }}>
            <div className="bg-gradient-to-tr from-turf-600 to-turf-400 p-4 rounded-xl shadow-lg shadow-turf-500/30 border-4 border-pitch rotate-45 hover:scale-110 transition-transform group">
              <Zap className="w-6 h-6 text-slate-900 -rotate-45 fill-current" />
            </div>
          </NavLink>

          <NavLink to="/chat" className={navClass}>
            {({ isActive }) => (
              <div className="relative">
                <MessageSquare className={`w-6 h-6 mb-0.5 ${isActive ? 'stroke-[3px]' : ''}`} />
                {unreadChatCount > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-pitch-surface">
                    {unreadChatCount}
                  </div>
                )}
                {isActive && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-turf-500 rounded-full shadow-neon"></span>}
              </div>
            )}
          </NavLink>

          {isLoggedIn ? (
            <NavLink to="/team" className={navClass}>
              {({ isActive }) => (
                <>
                  <User className={`w-6 h-6 mb-0.5 ${isActive ? 'stroke-[3px]' : ''}`} />
                  {isActive && <span className="absolute -bottom-2 w-1 h-1 bg-turf-500 rounded-full shadow-neon"></span>}
                </>
              )}
            </NavLink>
          ) : (
            <NavLink to="/login" className={navClass}>
              {({ isActive }) => (
                <>
                  <User className={`w-6 h-6 mb-0.5 ${isActive ? 'stroke-[3px]' : ''}`} />
                  {isActive && <span className="absolute -bottom-2 w-1 h-1 bg-turf-500 rounded-full shadow-neon"></span>}
                </>
              )}
            </NavLink>
          )}
        </div>
      </nav>
    </>
  );
};
