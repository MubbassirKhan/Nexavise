import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { AttackSurfacePage } from './pages/AttackSurface';
import { ScanCenterPage } from './pages/ScanCenter';
import { VulnerabilityCenterPage } from './pages/VulnerabilityCenter';
import { FindingDetailPage } from './pages/FindingDetail';
import { AttackPathsPage } from './pages/AttackPaths';
import { ReportsPage } from './pages/Reports';
import { AdminPage } from './pages/Admin';
import { getStoredUser } from './lib/api';

function AdminRoute() {
  const user = getStoredUser();
  return user?.role === 'admin' ? <AdminPage /> : <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected (authenticated) layout */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/attack-surface" element={<AttackSurfacePage />} />
          <Route path="/scan-center" element={<ScanCenterPage />} />
          <Route path="/vulnerabilities" element={<VulnerabilityCenterPage />} />
          <Route path="/vulnerabilities/:id" element={<FindingDetailPage />} />
          <Route path="/attack-paths" element={<AttackPathsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/admin" element={<AdminRoute />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
