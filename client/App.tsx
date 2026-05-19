import React, { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapApp } from '@capacitor/app';
import axios from 'axios';
import api from './services/api';
import { Navbar } from './components/Layout/Navbar';
import { ProtectedRoute } from './components/Layout/ProtectedRoute';
import { BusinessProtectedRoute } from './components/Layout/BusinessProtectedRoute';
import { RatingModal } from './components/Modals/RatingModal';
import { PendingRating } from './types';
import { initializePushNotifications, syncPushToken, clearBadge } from './services/pushNotificationService';
import { initRevenueCat } from './services/revenuecatService';
import { LocationProvider, useLocationContext } from './contexts/LocationContext';
import { FilterProvider } from './contexts/FilterContext';
import { SocketProvider } from './contexts/SocketContext';
import { useKeyboardScroll } from './utils/useKeyboardScroll';

// Haversine — iki koordinat arası km mesafe
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Lazy page imports (code splitting — reduces initial bundle from ~1.17MB → ~200KB) ──
const Marketplace = lazy(() => import('./pages/customer/Marketplace/Marketplace').then(m => ({ default: m.Marketplace })));
const TeamProfile = lazy(() => import('./pages/customer/TeamProfile/TeamProfile').then(m => ({ default: m.TeamProfile })));
const JokerPool = lazy(() => import('./pages/customer/JokerPool/JokerPool').then(m => ({ default: m.JokerPool })));
const PitchBooking = lazy(() => import('./pages/customer/PitchBooking/PitchBooking').then(m => ({ default: m.PitchBooking })));
const Chat = lazy(() => import('./pages/customer/Chat/Chat').then(m => ({ default: m.Chat })));
const Notifications = lazy(() => import('./pages/customer/Notifications/Notifications').then(m => ({ default: m.Notifications })));
const Login = lazy(() => import('./pages/customer/Login/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/customer/Register/Register').then(m => ({ default: m.Register })));
const ProfileSettings = lazy(() => import('./pages/customer/ProfileSettings/ProfileSettings').then(m => ({ default: m.ProfileSettings })));
const FavoriteBusinessesSettings = lazy(() => import('./pages/customer/FavoriteBusinesses/FavoriteBusinessesSettings').then(m => ({ default: m.FavoriteBusinessesSettings })));
const TeamSettings = lazy(() => import('./pages/customer/TeamSettings/TeamSettings').then(m => ({ default: m.TeamSettings })));
const BusinessLogin = lazy(() => import('./pages/business/BusinessLogin/BusinessLogin').then(m => ({ default: m.BusinessLogin })));
const BusinessRegister = lazy(() => import('./pages/business/BusinessRegister/BusinessRegister').then(m => ({ default: m.BusinessRegister })));
const BusinessDashboard = lazy(() => import('./pages/business/BusinessDashboard/BusinessDashboard').then(m => ({ default: m.BusinessDashboard })));
const BusinessSettingsHub = lazy(() => import('./pages/business/BusinessSettingsHub/BusinessSettingsHub').then(m => ({ default: m.BusinessSettingsHub })));
const BusinessInfoSettings = lazy(() => import('./pages/business/BusinessInfoSettings/BusinessInfoSettings').then(m => ({ default: m.BusinessInfoSettings })));
const BusinessPitchList = lazy(() => import('./pages/business/BusinessPitchList/BusinessPitchList').then(m => ({ default: m.BusinessPitchList })));
const BusinessPitchSettings = lazy(() => import('./pages/business/BusinessPitchSettings/BusinessPitchSettings').then(m => ({ default: m.BusinessPitchSettings })));
const BusinessPasswordSettings = lazy(() => import('./pages/business/BusinessPasswordSettings/BusinessPasswordSettings').then(m => ({ default: m.BusinessPasswordSettings })));
const BusinessSubscriptionSettings = lazy(() => import('./pages/business/BusinessSubscriptionSettings/BusinessSubscriptionSettings').then(m => ({ default: m.BusinessSubscriptionSettings })));
const BusinessNotificationsPage = lazy(() => import('./pages/business/BusinessNotificationsPage/BusinessNotificationsPage').then(m => ({ default: m.BusinessNotificationsPage })));
const BusinessStats = lazy(() => import('./pages/business/BusinessStats/BusinessStats').then(m => ({ default: m.BusinessStats })));
const ForgotPassword = lazy(() => import('./pages/customer/ForgotPassword/ForgotPassword').then(m => ({ default: m.ForgotPassword })));

// ── Animated full-screen loading fallback ────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center h-full w-full bg-slate-900">
    <div className="flex flex-col items-center" style={{ gap: 0 }}>
      {/* Beyaz top — yukarıdan kaleye (icon) doğru düşer ve zıplar */}
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: 'white',
          boxShadow: '0 0 8px rgba(255,255,255,0.7)',
          animation: 'dimliball 1.5s cubic-bezier(0.25,0.46,0.45,0.94) infinite',
          marginBottom: 4,
        }}
      />
      <img
        src="/icon.png"
        alt="DİMLİ"
        style={{ height: 56, width: 'auto', objectFit: 'contain' }}
      />
    </div>
    <style>{`
      @keyframes dimliball {
        0%   { transform: translateY(-72px); opacity: 0; }
        30%  { opacity: 1; }
        45%  { transform: translateY(0px); }
        58%  { transform: translateY(-20px); }
        70%  { transform: translateY(0px); }
        80%  { transform: translateY(-8px); }
        90%  { transform: translateY(0px); }
        100% { transform: translateY(-72px); opacity: 0; }
      }
    `}</style>
  </div>
);

function AppContent() {
  useKeyboardScroll();
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/notifications' ||
    location.pathname.startsWith('/business') ||
    location.pathname.startsWith('/settings');
  const [pendingRatings, setPendingRatings] = useState<PendingRating[]>([]);
  const { updateCoords } = useLocationContext();
  const prevGpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const prevLocationNameRef = useRef<string | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  // Android & iOS: StatusBar + SplashScreen + RevenueCat on first mount
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark });
      if (Capacitor.getPlatform() === 'android') {
        StatusBar.setBackgroundColor({ color: '#0f172a' });
      }
      // Hide splash screen now that React has mounted
      SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => { });
      // RevenueCat SDK başlat
      initRevenueCat().catch(() => { });
    }
  }, []);

  // Android: Geri tuşu yönetimi
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = CapApp.addListener('backButton', () => {
      const hash = window.location.hash;
      const isRoot = hash === '#/' || hash === '#/login' || hash === '#/register' || hash === '';
      if (isRoot) {
        CapApp.exitApp();
      } else {
        window.history.back();
      }
    });

    return () => {
      listenerPromise.then(h => h.remove());
    };
  }, []);

  // Oturum süresi dolduğunda veya token geçersizleştiğinde login'e yönlendir
  useEffect(() => {
    const handleExpired = () => {
      const hash = window.location.hash;
      const authPrefixes = ['#/login', '#/register', '#/forgot-password', '#/business/'];
      if (!authPrefixes.some(p => hash.startsWith(p))) {
        navigate('/login', { replace: true, state: { sessionExpired: true } });
      }
    };
    window.addEventListener('auth:sessionExpired', handleExpired);
    return () => window.removeEventListener('auth:sessionExpired', handleExpired);
  }, [navigate]);

  // Render free tier'ı uyanık tut — 8 dk < Render'ın 15 dk uyku timeout'u
  useEffect(() => {
    const id = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token) api.get('/users/me').catch(() => {});
    }, 8 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const getHandledRatings = (): string[] => {
    try { return JSON.parse(localStorage.getItem('handled_ratings') || '[]'); } catch { return []; }
  };

  const markRatingHandled = (reservationId: string) => {
    const handled = getHandledRatings();
    if (!handled.includes(reservationId)) {
      handled.push(reservationId);
      localStorage.setItem('handled_ratings', JSON.stringify(handled));
    }
  };

  const handleSubmitRating = async (
    reservationId: string,
    businessScore: number,
    fairPlayScore: number | null
  ) => {
    const current = pendingRatings[0];
    if (!current) return;
    // Mark as handled immediately so it never shows again regardless of API success
    markRatingHandled(current.reservationId);
    try {
      if (current.needsBusinessRating && businessScore > 0) {
        await api.post('/ratings', {
          reservationId,
          type: 'BUSINESS',
          targetBusinessId: current.businessId,
          score: businessScore,
        });
      }
      if (fairPlayScore !== null && current.needsFairPlayRating && current.opponentTeamId) {
        await api.post('/ratings', {
          reservationId,
          type: 'FAIRPLAY',
          targetTeamId: current.opponentTeamId,
          score: fairPlayScore,
        });
      }
    } catch (e) {
      // Ignore duplicate/conflict errors (409) — rating already saved
    } finally {
      setPendingRatings((prev: PendingRating[]) => prev.slice(1));
    }
  };

  const handleSkipRating = () => {
    // Sadece bu oturumda kapat; localStorage'a yazma. Böylece bir sonraki açılışta tekrar gelir.
    // Kullanıcı Geçmiş Maçlar'dan değerlendirme yapabilir.
    setPendingRatings((prev: PendingRating[]) => prev.slice(1));
  };

  useEffect(() => {
    let initTimer: ReturnType<typeof setTimeout>;
    let watchTimer: ReturnType<typeof setTimeout>;
    let stateListener: { remove: () => void } | null = null;

    // iOS: 3 dk, Android: 2 dk — GPS modülü aralarında kapalı kalır
    const LOCATION_INTERVAL_MS = Capacitor.getPlatform() === 'ios'
      ? 3 * 60 * 1000
      : 2 * 60 * 1000;

    const poll = async () => {
      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        });
        const { latitude, longitude } = position.coords;
        updateCoords({ lat: latitude, lng: longitude });

        // 250 metreden az hareket ettiyse backend'e PATCH atma
        const prev = prevGpsRef.current;
        if (prev && haversineKm(prev.lat, prev.lng, latitude, longitude) < 0.25) return;
        prevGpsRef.current = { lat: latitude, lng: longitude };

        const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        if (response.data && response.data.address) {
          const address = response.data.address;
          const locationName = address.district || address.city || address.town || address.state;
          if (locationName && locationName !== prevLocationNameRef.current) {
            prevLocationNameRef.current = locationName;
            await api.patch('/users/me', { location: locationName });
          }
        }
      } catch {
        // GPS hatası veya konum izni yok — sessizce geç
      }
    };

    const startLocationTracking = () => {
      const token = localStorage.getItem('token');
      if (!token || isAuthPage) return;
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      poll();
      locationIntervalRef.current = setInterval(poll, LOCATION_INTERVAL_MS);
    };

    const stopLocationTracking = () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    };

    const initServices = async () => {
      const token = localStorage.getItem('token');
      if (!token || isAuthPage) return;

      // Push notifications ve rating kontrolünü geciktir:
      // Marketplace verileri yüklendikten sonra başlasın (Android WebView'ı yormasın)
      initTimer = setTimeout(async () => {
        // Initialize Push Notifications
        await initializePushNotifications();
        await syncPushToken();

        // Check for pending match ratings
        try {
          const res = await api.get('/ratings/pending');
          if (res.data && res.data.length > 0) {
            const handled = getHandledRatings();
            const filtered = (res.data as PendingRating[]).filter(
              (r: PendingRating) => !handled.includes(r.reservationId)
            );
            if (filtered.length > 0) setPendingRatings(filtered);
          }
        } catch (e) {
          // Non-blocking
        }
      }, 3000); // 3 saniye bekle

      // Konum takibini daha da geciktir
      watchTimer = setTimeout(async () => {
        try {
          const permission = await Geolocation.checkPermissions();
          if (permission.location !== 'granted') return;
          startLocationTracking();
        } catch {
          // İzin yoksa sessizce geç
        }
      }, 5000);
    };

    // Uygulama arka plana alınınca interval dur, ön plana gelince yeniden başla
    CapApp.addListener('appStateChange', (state) => {
      if (state.isActive) {
        clearBadge();
        startLocationTracking();
      } else {
        stopLocationTracking();
      }
    }).then(h => { stateListener = h; });

    initServices();

    return () => {
      clearTimeout(initTimer);
      clearTimeout(watchTimer);
      stopLocationTracking();
      if (stateListener) stateListener.remove();
    };
  }, [isAuthPage]);

  return (
    <div className="flex flex-col h-dvh bg-pitch text-white overflow-hidden">
      <div ref={scrollRef} className={`flex-1 overflow-y-auto overscroll-y-contain scrollbar-hide bg-pitch ${isAuthPage ? '' : 'pb-nav'}`}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/business/login" element={<BusinessLogin />} />
            <Route path="/business/register" element={<BusinessRegister />} />
            <Route element={<BusinessProtectedRoute />}>
              <Route path="/business/dashboard" element={<BusinessDashboard />} />
              <Route path="/business/settings" element={<BusinessSettingsHub />} />
              <Route path="/business/settings/info" element={<BusinessInfoSettings />} />
              <Route path="/business/settings/pitches" element={<BusinessPitchList />} />
              <Route path="/business/settings/pitches/:pitchId" element={<BusinessPitchSettings />} />
              <Route path="/business/settings/password" element={<BusinessPasswordSettings />} />
              <Route path="/business/settings/subscription" element={<BusinessSubscriptionSettings />} />
              <Route path="/business/notifications" element={<BusinessNotificationsPage />} />
              <Route path="/business/stats" element={<BusinessStats />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Marketplace />} />
              <Route path="/pitches" element={<PitchBooking />} />
              <Route path="/jokers" element={<JokerPool />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/team" element={<TeamProfile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings/profile" element={<ProfileSettings />} />
              <Route path="/settings/favorites" element={<FavoriteBusinessesSettings />} />
              <Route path="/settings/team" element={<TeamSettings />} />
            </Route>
          </Routes>
        </Suspense>
      </div>
      {pendingRatings.length > 0 && (
        <RatingModal
          key={pendingRatings[0].reservationId}
          pending={pendingRatings[0]}
          onSubmit={handleSubmitRating}
          onSkip={handleSkipRating}
        />
      )}
      {!isAuthPage && <Navbar />}
    </div>
  );
}

function App() {
  return (
    <LocationProvider>
      <FilterProvider>
        <SocketProvider>
          <HashRouter>
            <AppContent />
          </HashRouter>
        </SocketProvider>
      </FilterProvider>
    </LocationProvider>
  );
}

export default App;
