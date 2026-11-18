import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from './providers/AppProviders';
import { App } from './router/AppRoutes';
import '../styles/index.css';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);
