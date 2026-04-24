import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AsgardeoProvider } from '@asgardeo/react';
import { asgardeoProviderProps } from './config/asgardeo.js';
import { HardcodedAdminProvider } from './context/HardcodedAdminContext.jsx';
import { StrataChatLauncher } from './components/StrataChatLauncher.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AsgardeoProvider {...asgardeoProviderProps}>
      <HardcodedAdminProvider>
        <App />
        <StrataChatLauncher />
      </HardcodedAdminProvider>
    </AsgardeoProvider>
  </StrictMode>
);
