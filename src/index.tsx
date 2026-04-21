import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import { HelmetProvider } from 'react-helmet-async';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <TDSMobileAITProvider>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </TDSMobileAITProvider>
);
