import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Placeholder shell — the UI is built after the graph-integrity step is approved.
function App() {
  return <main className="p-6">Scaffold.</main>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
