import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import './index.css';
// Gömülü (offline) ülke bayrakları — self-hosted SVG, internet gerektirmez. <Flag/> ile kullanılır.
import 'flag-icons/css/flag-icons.min.css';
import App from './App';
import { CUSTOMER_HOME } from './constants/routes';

// Boot rotası = müşteri ana ekranı (/pitches). Guard'lar işletmeyi dashboard'a, oturumsuzu
// login'e zaten yönlendirir (eski '#/' başlangıcının birebir eşleniği; Maç Pazarı boot'ta
// hiç mount olmaz). replaceState (push değil): geçmişte hayalet '#/' girişi kalmaz.
// HashRouter'dan ÖNCE çalışmalı — bu yüzden render'dan önce, modül scope'ta.
if (!window.location.hash) {
  window.history.replaceState(null, '', `#${CUSTOMER_HOME}`);
}

// Sigorta: launchAutoHide:false — JS, AnimatedSplash'a ulaşamadan hata alırsa kullanıcı
// sonsuza dek native splash'ta kalmasın. Normal akışta 8sn'de splash çoktan gizli → no-op.
if (Capacitor.isNativePlatform()) {
  setTimeout(() => SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => { }), 8000);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);