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

const ProtectedRoute = ({ children, allowedRoles, redirectTo = '/login' }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
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
          </Routes>
          <PWAInstallBanner />
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
