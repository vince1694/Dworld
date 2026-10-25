import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';
import AppLayout from './components/AppLayout';
import AdminLayout from './components/AdminLayout';
import PWAInstallBanner from './components/PWAInstallBanner';
import Home from './pages/Home';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import ExpertDashboard from './pages/ExpertDashboard';
import Services from './pages/Services';
import ExpertsDirectory from './pages/ExpertsDirectory';
import Contact from './pages/Contact';
import ForgotPassword from './pages/ForgotPassword';
import BookAppointment from './pages/BookAppointment';
import WalletPage from './pages/WalletPage';
import Chat from './pages/Chat';
import ExpertProfilePage from './pages/ExpertProfilePage';
import AppointmentDetailsPage from './pages/AppointmentDetailsPage';
import PaidServicesPage from './pages/PaidServicesPage';

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
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/services" element={
              <ProtectedRoute>
                <Services />
              </ProtectedRoute>
            } />
            <Route path="/experts" element={<Navigate to="/services?tab=experts" replace />} />
            <Route path="/expert/:id" element={
              <ProtectedRoute>
                <AppLayout>
                  <ExpertProfilePage />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/contact" element={
              <ProtectedRoute>
                <Contact />
              </ProtectedRoute>
            } />
            
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
          <PWAInstallBanner />
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
