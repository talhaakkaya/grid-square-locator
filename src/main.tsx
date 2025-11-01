import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CACHE_DURATIONS } from './utils/constants'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'

// Create a client with cache configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_DURATIONS.QUERY_STALE,
      gcTime: CACHE_DURATIONS.QUERY_GC,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
