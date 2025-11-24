
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

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 md:pb-0">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Marketplace />} />
            <Route path="/team" element={<TeamProfile />} />
            <Route path="/jokers" element={<JokerPool />} />
            <Route path="/pitches" element={<PitchBooking />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/notifications" element={<Notifications />} />
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