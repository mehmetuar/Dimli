import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// Gömülü (offline) ülke bayrakları — self-hosted SVG, internet gerektirmez. <Flag/> ile kullanılır.
import 'flag-icons/css/flag-icons.min.css';
import App from './App';

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