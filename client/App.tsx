
import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Marketplace } from './pages/Marketplace';
import { TeamProfile } from './pages/TeamProfile';
import { JokerPool } from './pages/JokerPool';
import { PitchBooking } from './pages/PitchBooking';
import { Chat } from './pages/Chat';
import { Notifications } from './pages/Notifications';

import { Login } from './pages/Login';
import { Register } from './pages/Register';

import { ProtectedRoute } from './components/ProtectedRoute';
import { ProfileSettings } from './pages/ProfileSettings';
import { TeamSettings } from './pages/TeamSettings';

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="flex flex-col h-screen bg-pitch text-white overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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