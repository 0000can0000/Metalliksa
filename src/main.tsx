import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DigitalTwinProvider } from './context/DigitalTwinContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DigitalTwinProvider>
      <App />
    </DigitalTwinProvider>
  </StrictMode>,
);
