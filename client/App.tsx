import React, { useEffect, useState, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapApp } from '@capacitor/app';
import axios from 'axios';
import api from './services/api';
import { Navbar } from './components/Layout/Navbar';
import { ProtectedRoute } from './components/Layout/ProtectedRoute';
import { RatingModal } from './components/Modals/RatingModal';
import { PendingRating } from './types';
import { initializePushNotifications } from './services/pushNotificationService';

// ── Lazy page imports (code splitting — reduces initial bundle from ~1.17MB → ~200KB) ──
const Marketplace           = lazy(() => import('./pages/customer/Marketplace/Marketplace').then(m => ({ default: m.Marketplace })));
const TeamProfile           = lazy(() => import('./pages/customer/TeamProfile/TeamProfile').then(m => ({ default: m.TeamProfile })));
const JokerPool             = lazy(() => import('./pages/customer/JokerPool/JokerPool').then(m => ({ default: m.JokerPool })));
const PitchBooking          = lazy(() => import('./pages/customer/PitchBooking/PitchBooking').then(m => ({ default: m.PitchBooking })));
const Chat                  = lazy(() => import('./pages/customer/Chat/Chat').then(m => ({ default: m.Chat })));
const Notifications         = lazy(() => import('./pages/customer/Notifications/Notifications').then(m => ({ default: m.Notifications })));
const Login                 = lazy(() => import('./pages/customer/Login/Login').then(m => ({ default: m.Login })));
const Register              = lazy(() => import('./pages/customer/Register/Register').then(m => ({ default: m.Register })));
const ProfileSettings       = lazy(() => import('./pages/customer/ProfileSettings/ProfileSettings').then(m => ({ default: m.ProfileSettings })));
const FavoriteBusinessesSettings = lazy(() => import('./pages/customer/FavoriteBusinesses/FavoriteBusinessesSettings').then(m => ({ default: m.FavoriteBusinessesSettings })));
const TeamSettings          = lazy(() => import('./pages/customer/TeamSettings/TeamSettings').then(m => ({ default: m.TeamSettings })));
const BusinessLogin         = lazy(() => import('./pages/business/BusinessLogin/BusinessLogin').then(m => ({ default: m.BusinessLogin })));
const BusinessRegister      = lazy(() => import('./pages/business/BusinessRegister/BusinessRegister').then(m => ({ default: m.BusinessRegister })));
const BusinessDashboard     = lazy(() => import('./pages/business/BusinessDashboard/BusinessDashboard').then(m => ({ default: m.BusinessDashboard })));
const BusinessSettingsHub   = lazy(() => import('./pages/business/BusinessSettingsHub/BusinessSettingsHub').then(m => ({ default: m.BusinessSettingsHub })));
const BusinessInfoSettings  = lazy(() => import('./pages/business/BusinessInfoSettings/BusinessInfoSettings').then(m => ({ default: m.BusinessInfoSettings })));
const BusinessPitchList     = lazy(() => import('./pages/business/BusinessPitchList/BusinessPitchList').then(m => ({ default: m.BusinessPitchList })));
const BusinessPitchSettings = lazy(() => import('./pages/business/BusinessPitchSettings/BusinessPitchSettings').then(m => ({ default: m.BusinessPitchSettings })));
const BusinessPasswordSettings = lazy(() => import('./pages/business/BusinessPasswordSettings/BusinessPasswordSettings').then(m => ({ default: m.BusinessPasswordSettings })));
const BusinessNotificationsPage = lazy(() => import('./pages/business/BusinessNotificationsPage/BusinessNotificationsPage').then(m => ({ default: m.BusinessNotificationsPage })));

// ── Minimal full-screen loading fallback ─────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center h-full w-full bg-slate-900">
    <div className="flex flex-col items-center gap-4">
      <img src="/logo.png" alt="DIMLİ" className="h-14 w-auto object-contain animate-pulse" />
    </div>
  </div>
);

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname.startsWith('/business');
  const [watchId, setWatchId] = useState<string | null>(null);
  const [pendingRatings, setPendingRatings] = useState<PendingRating[]>([]);

  // Android & iOS: StatusBar + SplashScreen on first mount
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark });
      if (Capacitor.getPlatform() === 'android') {
        StatusBar.setBackgroundColor({ color: '#0f172a' });
      }
      // Hide splash screen now that React has mounted
      SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
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
    let currentWatchId: string | null = null;
    let initTimer: ReturnType<typeof setTimeout>;
    let watchTimer: ReturnType<typeof setTimeout>;

    const initServices = async () => {
      const token = localStorage.getItem('token');
      if (!token || isAuthPage) return;

      // Push notifications ve rating kontrolünü geciktir:
      // Marketplace verileri yüklendikten sonra başlasın (Android WebView'ı yormasın)
      initTimer = setTimeout(async () => {
        // Initialize Push Notifications
        await initializePushNotifications();

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

      // Arka plan konum takibini daha da geciktir
      watchTimer = setTimeout(() => startWatching(), 5000);
    };

    const startWatching = async () => {
      const token = localStorage.getItem('token');
      if (!token || isAuthPage) return;

      try {
        const permission = await Geolocation.checkPermissions();
        if (permission.location !== 'granted') return;

        currentWatchId = await Geolocation.watchPosition(
          // enableHighAccuracy: false — Android'de daha hızlı ve stabil
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 },
          async (position, err) => {
            if (err || !position) return;
            try {
              const { latitude, longitude } = position.coords;
              const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
              if (response.data && response.data.address) {
                const address = response.data.address;
                const locationName = address.district || address.city || address.town || address.state;
                if (locationName) {
                  await api.patch('/users/me', { location: locationName });
                }
              }
            } catch {
              // Sessizce geç
            }
          }
        );
        setWatchId(currentWatchId);
      } catch {
        // Konum izni yoksa sessizce geç
      }
    };

    initServices();

    return () => {
      clearTimeout(initTimer);
      clearTimeout(watchTimer);
      if (currentWatchId) {
        Geolocation.clearWatch({ id: currentWatchId });
      }
    };
  }, [isAuthPage]);

  return (
    <div className="flex flex-col h-screen bg-pitch text-white overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/business/login" element={<BusinessLogin />} />
            <Route path="/business/register" element={<BusinessRegister />} />
            <Route path="/business/dashboard" element={<BusinessDashboard />} />
            <Route path="/business/settings" element={<BusinessSettingsHub />} />
            <Route path="/business/settings/info" element={<BusinessInfoSettings />} />
            <Route path="/business/settings/pitches" element={<BusinessPitchList />} />
            <Route path="/business/settings/pitches/:pitchId" element={<BusinessPitchSettings />} />
            <Route path="/business/settings/password" element={<BusinessPasswordSettings />} />
            <Route path="/business/notifications" element={<BusinessNotificationsPage />} />
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
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;
