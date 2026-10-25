import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';
import AppLayout from './components/AppLayout';
import AdminLayout from './components/AdminLayout';
import PWAInstallBanner from './components/PWAInstallBanner';

// Eager load Home for instant initial page render
import Home from './pages/Home';

// Code-split all other routes to slash bundle size and maximize load speed
const Login = lazy(() => import('./pages/Login'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Admin = lazy(() => import('./pages/Admin'));
const ExpertDashboard = lazy(() => import('./pages/ExpertDashboard'));
const Services = lazy(() => import('./pages/Services'));
const Contact = lazy(() => import('./pages/Contact'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const BookAppointment = lazy(() => import('./pages/BookAppointment'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const Chat = lazy(() => import('./pages/Chat'));
const ExpertProfilePage = lazy(() => import('./pages/ExpertProfilePage'));
const AppointmentDetailsPage = lazy(() => import('./pages/AppointmentDetailsPage'));
const PaidServicesPage = lazy(() => import('./pages/PaidServicesPage'));

const RouteFallback = () => (
  <div style={{
    minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexDirection: 'column', gap: '0.85rem'
  }}>
    <div style={{
      width: 32, height: 32,
      border: '3px solid rgba(99,102,241,0.18)',
      borderTop: '3px solid #6366f1',
      borderRadius: '50%',
      animation: 'appSpin 0.7s linear infinite'
    }} />
    <style>{`@keyframes appSpin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles, redirectTo = '/login' }) => {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-main, #0f0f1a)', flexDirection: 'column', gap: '1rem'
    }}>
      <div style={{
        width: 36, height: 36,
        border: '3px solid rgba(99,102,241,0.2)',
        borderTop: '3px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!user) return <Navigate to={redirectTo} />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (allowedRoles.includes('admin')) {
      return <Navigate to="/admin/login" />;
    }
    return <Navigate to="/" />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Navbar />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/services" element={<Services />} />
              <Route path="/experts" element={<Navigate to="/services?tab=experts" replace />} />
              <Route path="/expert/:id" element={
                <AppLayout>
                  <ExpertProfilePage />
                </AppLayout>
              } />
              <Route path="/contact" element={<Contact />} />
              
              <Route path="/book" element={
                <ProtectedRoute>
                  <AppLayout>
                    <BookAppointment />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/wallet" element={
                <ProtectedRoute>
                  <AppLayout>
                    <WalletPage />
                  </AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/chat" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Chat />
                  </AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/appointment/:id" element={
                <ProtectedRoute>
                  <AppLayout>
                    <AppointmentDetailsPage />
                  </AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/appointments/:id" element={
                <ProtectedRoute>
                  <AppLayout>
                    <AppointmentDetailsPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/paid-services" element={
                <ProtectedRoute>
                  <AppLayout>
                    <PaidServicesPage />
                  </AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login">
                  <AdminLayout>
                    <Admin />
                  </AdminLayout>
                </ProtectedRoute>
              } />

              <Route path="/expert" element={
                <ProtectedRoute allowedRoles={['expert', 'stylist']}>
                  <ExpertDashboard />
                </ProtectedRoute>
              } />

              {/* Fallback for unknown / 404 paths */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <PWAInstallBanner />
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
