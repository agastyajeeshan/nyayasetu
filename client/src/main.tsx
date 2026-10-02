import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { AuthProvider } from './context/AuthContext.js';
import { AccessibilityProvider } from './context/AccessibilityContext.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AccessibilityProvider>
        <App />
      </AccessibilityProvider>
    </AuthProvider>
  </React.StrictMode>,
);
