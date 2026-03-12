import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Geolocation } from '@capacitor/geolocation';
import axios from 'axios';
import api from './services/api';
import { Navbar } from './components/Layout/Navbar';
import { Marketplace } from './pages/customer/Marketplace/Marketplace';
import { TeamProfile } from './pages/customer/TeamProfile/TeamProfile';
import { JokerPool } from './pages/customer/JokerPool/JokerPool';
import { PitchBooking } from './pages/customer/PitchBooking/PitchBooking';
import { Chat } from './pages/customer/Chat/Chat';
import { Notifications } from './pages/customer/Notifications/Notifications';
import { initializePushNotifications } from './services/pushNotificationService';

import { Login } from './pages/customer/Login/Login';
import { Register } from './pages/customer/Register/Register';
import { BusinessLogin } from './pages/business/BusinessLogin/BusinessLogin';
import { BusinessRegister } from './pages/business/BusinessRegister/BusinessRegister';
import { BusinessDashboard } from './pages/business/BusinessDashboard/BusinessDashboard';
import { BusinessSettingsHub } from './pages/business/BusinessSettingsHub/BusinessSettingsHub';
import { BusinessInfoSettings } from './pages/business/BusinessInfoSettings/BusinessInfoSettings';
import { BusinessPitchList } from './pages/business/BusinessPitchList/BusinessPitchList';
import { BusinessPitchSettings } from './pages/business/BusinessPitchSettings/BusinessPitchSettings';
import { BusinessPasswordSettings } from './pages/business/BusinessPasswordSettings/BusinessPasswordSettings';
import { BusinessNotificationsPage } from './pages/business/BusinessNotificationsPage/BusinessNotificationsPage';

import { ProtectedRoute } from './components/Layout/ProtectedRoute';
import { ProfileSettings } from './pages/customer/ProfileSettings/ProfileSettings';
import { TeamSettings } from './pages/customer/TeamSettings/TeamSettings';

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname.startsWith('/business');
  const [watchId, setWatchId] = useState<string | null>(null);

  useEffect(() => {
    let currentWatchId: string | null = null;

    const initServices = async () => {
      const token = localStorage.getItem('token');
      if (!token || isAuthPage) return;

      // Initialize Push Notifications
      await initializePushNotifications();

      // Initialize Background Location Tracking
      startWatching();
    };

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

    initServices();

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