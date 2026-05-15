import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { About } from './pages/About';
import { SourceList } from './pages/SourceList';
import { SourceDetail } from './pages/SourceDetail';
import { ObservationList } from './pages/ObservationList';
import { ReviewQueue } from './pages/ReviewQueue';
import { GraphView } from './pages/GraphView';
import { HypothesisList } from './pages/HypothesisList';
import { HypothesisDetail } from './components/HypothesisDetail';
import { FrameworkList } from './pages/FrameworkList';
import { FrameworkDetail } from './pages/FrameworkDetail';
import { CaseList } from './pages/CaseList';
import { CaseDetail } from './pages/CaseDetail';
import { CaseReviewQueue } from './pages/CaseReviewQueue';


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
          <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/about" element={<RequireAuth><About /></RequireAuth>} />
          <Route path="/sources" element={<RequireAuth><SourceList /></RequireAuth>} />
          <Route path="/sources/:id" element={<RequireAuth><SourceDetail /></RequireAuth>} />
          <Route path="/observations" element={<RequireAuth><ObservationList /></RequireAuth>} />
          <Route path="/review" element={<RequireAuth><ReviewQueue /></RequireAuth>} />
          <Route path="/graph" element={<RequireAuth><GraphView /></RequireAuth>} />
          <Route path="/hypotheses" element={<RequireAuth><HypothesisList /></RequireAuth>} />
          <Route path="/hypotheses/:id" element={<RequireAuth><HypothesisDetail /></RequireAuth>} />
          <Route path="/frameworks" element={<RequireAuth><FrameworkList /></RequireAuth>} />
          <Route path="/frameworks/:id" element={<RequireAuth><FrameworkDetail /></RequireAuth>} />
          <Route path="/cases/review" element={<RequireAuth><CaseReviewQueue /></RequireAuth>} />
          <Route path="/cases/:id" element={<RequireAuth><CaseDetail /></RequireAuth>} />
          <Route path="/cases" element={<RequireAuth><CaseList /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
