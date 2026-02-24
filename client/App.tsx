import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Geolocation } from '@capacitor/geolocation';
import axios from 'axios';
import api from './services/api';
import { Navbar } from './components/Navbar';
import { Marketplace } from './pages/Marketplace';
import { TeamProfile } from './pages/TeamProfile';
import { JokerPool } from './pages/JokerPool';
import { PitchBooking } from './pages/PitchBooking';
import { Chat } from './pages/Chat';
import { Notifications } from './pages/Notifications';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { BusinessLogin } from './pages/business/BusinessLogin';
import { BusinessRegister } from './pages/business/BusinessRegister';
import { BusinessDashboard } from './pages/business/BusinessDashboard';
import { BusinessSettingsHub } from './pages/business/BusinessSettingsHub';
import { BusinessInfoSettings } from './pages/business/BusinessInfoSettings';
import { BusinessPitchList } from './pages/business/BusinessPitchList';
import { BusinessPitchSettings } from './pages/business/BusinessPitchSettings';
import { BusinessPasswordSettings } from './pages/business/BusinessPasswordSettings';
import { BusinessNotificationsPage } from './pages/business/BusinessNotificationsPage';

import { ProtectedRoute } from './components/ProtectedRoute';
import { ProfileSettings } from './pages/ProfileSettings';
import { TeamSettings } from './pages/TeamSettings';

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname.startsWith('/business');
  const [watchId, setWatchId] = useState<string | null>(null);

  useEffect(() => {
    let currentWatchId: string | null = null;

    const startWatching = async () => {
      // Only track if logged in as a normal user (has token and not on auth/business pages)
      const token = localStorage.getItem('token');
      if (!token || isAuthPage) return;

      try {
        const permission = await Geolocation.checkPermissions();
        if (permission.location !== 'granted') return; // Don't aggressively ask across the app, let ProfileSettings or UserProfile handle the initial prompt

        currentWatchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 },
          async (position, err) => {
            if (err || !position) return;
            try {
              const { latitude, longitude } = position.coords;
              const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
              if (response.data && response.data.address) {
                const address = response.data.address;
                const locationName = address.district || address.city || address.town || address.state;
                if (locationName) {
                  // Silently update location on backend
                  await api.patch('/users/me', { location: locationName });
                }
              }
            } catch (error) {
              console.error("Background location update failed", error);
            }
          }
        );
        setWatchId(currentWatchId);
      } catch (error) {
        console.error("Failed to start watching position", error);
      }
    };

    startWatching();

    return () => {
      if (currentWatchId) {
        Geolocation.clearWatch({ id: currentWatchId });
      }
    };
  }, [isAuthPage]);

  return (
    <div className="flex flex-col h-screen bg-pitch text-white overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
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
            <Route path="/settings/team" element={<TeamSettings />} />
          </Route>
        </Routes>
      </div>
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