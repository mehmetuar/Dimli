
import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Trophy, Users, Search, Zap, MessageSquare, User, Bell } from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '../constants';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);
  const isLoggedIn = !!localStorage.getItem('token');
  const showBell = true;
  const unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.read).length;

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

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center w-full h-full transition-all duration-300 relative group ${isActive
      ? 'text-turf-500 scale-110 -translate-y-1'
      : 'text-gray-400 hover:text-gray-200'
    }`;

  return (
    <>
      {/* Desktop Logo (Top Left Absolute) */}
      <div className="hidden md:flex fixed top-6 left-8 items-center gap-2 z-50 cursor-pointer" onClick={() => navigate('/')}>
        <div className="bg-turf-600 p-2 rounded skew-x-[-12deg]">
          <Trophy className="w-6 h-6 text-white skew-x-[12deg]" />
        </div>
        <span className="font-sport font-black text-3xl tracking-tighter text-white italic">
          SAHA<span className="text-turf-500">PRO</span>
        </span>
      </div>

      {/* Notification Bell (Top Right - Visible Mobile & Desktop) - Conditioned */}
      {showBell && isLoggedIn && location.pathname !== '/chat' && location.pathname !== '/team' && (
        <div className="fixed top-6 right-6 z-50">
          <button
            onClick={handleNotificationClick}
            className={`relative p-2 rounded-full border transition-all group ${location.pathname === '/notifications'
              ? 'bg-turf-600 border-turf-400 text-white shadow-neon'
              : 'bg-slate-800/80 backdrop-blur border-slate-700 text-white hover:border-turf-500'
              }`}
          >
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && location.pathname !== '/notifications' && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
            )}
          </button>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-4 left-4 right-4 h-16 bg-pitch-surface/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl shadow-black/50 z-50 md:max-w-md md:mx-auto md:bottom-8">
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

          {/* Center Action Button (Joker) */}
          <NavLink to="/jokers" className="relative -top-6">
            <div className="bg-gradient-to-tr from-turf-600 to-turf-400 p-4 rounded-xl shadow-lg shadow-turf-500/30 border-4 border-pitch transform rotate-45 hover:scale-110 transition-transform group">
              <Zap className="w-6 h-6 text-slate-900 transform -rotate-45 fill-current" />
            </div>
          </NavLink>

          <NavLink to="/chat" className={navClass}>
            {({ isActive }) => (
              <>
                <MessageSquare className={`w-6 h-6 mb-0.5 ${isActive ? 'stroke-[3px]' : ''}`} />
                {isActive && <span className="absolute -bottom-2 w-1 h-1 bg-turf-500 rounded-full shadow-neon"></span>}
              </>
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
