import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css';
import './styles/ui-kit.css';
import App from './App.tsx'
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createPersistedQueryClient } from "./lib/queryPersist";

const { queryClient, persistOptions } = createPersistedQueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <App />
    </PersistQueryClientProvider>
  </StrictMode>,
)
