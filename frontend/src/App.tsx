import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Login } from './pages/Login';
import { SourceList } from './pages/SourceList';
import { SourceDetail } from './pages/SourceDetail';
import { ClaimList } from './pages/ClaimList';
import { ReviewQueue } from './pages/ReviewQueue';
import { HypothesisList } from './pages/HypothesisList';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/sources" replace />} />
          <Route path="/sources" element={<RequireAuth><SourceList /></RequireAuth>} />
          <Route path="/sources/:id" element={<RequireAuth><SourceDetail /></RequireAuth>} />
          <Route path="/claims" element={<RequireAuth><ClaimList /></RequireAuth>} />
          <Route path="/review" element={<RequireAuth><ReviewQueue /></RequireAuth>} />
          <Route path="/hypotheses" element={<RequireAuth><HypothesisList /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/sources" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
