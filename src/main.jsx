import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { setupClientApiBridge } from './lib/clientApiMock.js';

// Setup client API bridge to ensure 100% offline & Netlify compatibility
setupClientApiBridge();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
