import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { STATIC_DEMO } from './deployment';
import './styles/tokens.css';
import './styles/typography.css';
import './styles/components.css';
import './styles/app.css';
import './styles/panel.css';
import './styles/admin.css';

if (STATIC_DEMO) document.body.classList.add('static-demo');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
