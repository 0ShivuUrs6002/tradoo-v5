import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import './styles.css';

import { ThemeProvider } from './components/ThemeProvider.jsx';
import { WorldProvider } from './components/WorldProvider.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <WorldProvider>
        <App />
      </WorldProvider>
    </ThemeProvider>
  </React.StrictMode>
);
