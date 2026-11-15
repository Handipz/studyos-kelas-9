/**
 * Copyright (c) 2026 Hanif. All rights reserved.
 * StudyOS Kelas 9 — Main Entry Point with Global Error Boundary.
 */
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {GlobalErrorBoundary} from './components/GlobalErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <GlobalErrorBoundary>
    <App />
  </GlobalErrorBoundary>
);


