import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
  CalendarRange, 
  PackagePlus, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Edit, 
  User, 
  Mail, 
  MapPin, 
  Clock, 
  Briefcase, 
  DollarSign, 
  CalendarCheck,
  TrendingUp,
  Plus,
  X,
  Sparkles,
  Wallet,
  ArrowDownLeft,
  MessageSquare,
  Download,
  Calendar,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ToastContainer from '../components/ToastContainer';
import AppointmentChatModal from '../components/AppointmentChatModal';
import ExpertActivationModal from '../components/ExpertActivationModal';
import { getGoogleCalendarUrl, downloadIcsFile } from '../utils/calendar';

import { API_URL } from '../config/api';

const ExpertDashboard = () => {
  const { user, refreshUser } = useAuth();
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'appointments';
  
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState([]);
  
  // Service Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', duration: '45', price: '', location: 'Main Studio' });
  const [editingServiceId, setEditingServiceId] = useState(null);
  
  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Availability & Working Hours
  const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [workingDays, setWorkingDays] = useState(
    user?.workingDays && user.workingDays.length > 0
      ? user.workingDays 
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  );
  const [workingHours, setWorkingHours] = useState({
    start: user?.workingHours?.start || '09:00',
    end: user?.workingHours?.end || '18:00'
  });
  const [savingAvailability, setSavingAvailability] = useState(false);

  // Chat State
  const [chatAppointment, setChatAppointment] = useState(null);

  useEffect(() => {
    fetchData();
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/wallet`);
      if (res.data.success) {
        setWalletBalance(res.data.data.walletBalance);
        setWalletTransactions(res.data.data.transactions || []);
      }
    } catch (err) {
      console.error('Error fetching expert wallet', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appRes, srvRes] = await Promise.all([
        axios.get(`${API_URL}/appointments/stylist-dashboard`),
        axios.get(`${API_URL}/services/my-services`)
      ]);
      if (appRes.data.success) setAppointments(appRes.data.data.appointments);
      if (srvRes.data.success) setServices(srvRes.data.data);

      // Refresh expert availability from user profile
      const userRes = await axios.get(`${API_URL}/auth/me`);
      if (userRes.data.success && userRes.data.data) {
        if (userRes.data.data.workingDays) setWorkingDays(userRes.data.data.workingDays);
        if (userRes.data.data.workingHours) setWorkingHours(userRes.data.data.workingHours);
      }
    } catch (err) {
      console.error('Error fetching expert data', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day) => {
    if (workingDays.includes(day)) {
      if (workingDays.length === 1) {
        addToast('You must keep at least one working day available.', 'error');
        return;
      }
      setWorkingDays(workingDays.filter(d => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const handleSaveAvailability = async (e) => {
    e.preventDefault();
    setSavingAvailability(true);
    try {
      const res = await axios.put(`${API_URL}/auth/availability`, {
        workingDays,
        workingHours
      });
      if (res.data.success) {
        addToast('Availability & working hours updated successfully!', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update availability', 'error');
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await axios.patch(`${API_URL}/appointments/${id}/status`, { status });
      if (res.data.success) {
        addToast(`Appointment set to ${status}`, 'success');
        fetchData();
      }
    } catch (err) {
      addToast('Failed to update appointment status.', 'error');
    }
  };

  const handleServiceChange = (e) => {
    setServiceForm({ ...serviceForm, [e.target.name]: e.target.value });
  };

  const openNewServiceModal = () => {
    setEditingServiceId(null);
    setServiceForm({ name: '', description: '', duration: '45', price: '', location: 'Main Studio' });
    setIsServiceModalOpen(true);
  };

  const handleEditService = (service) => {
    setServiceForm({
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      price: service.price,
      location: service.location || ''
    });
    setEditingServiceId(service.id || service._id);
    setIsServiceModalOpen(true);
  };

  const submitService = async (e) => {
    e.preventDefault();
    try {
      if (editingServiceId) {
        await axios.put(`${API_URL}/services/${editingServiceId}`, serviceForm);
        addToast('Service updated successfully!', 'success');
      } else {
        await axios.post(`${API_URL}/services`, serviceForm);
        addToast('Service created successfully!', 'success');
      }
      setIsServiceModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save service.', 'error');
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await axios.delete(`${API_URL}/services/${id}`);
      addToast('Service removed.', 'info');
      fetchData();
    } catch (err) {
      addToast('Failed to delete service.', 'error');
    }
  };

  const submitProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const res = await axios.put(`${API_URL}/auth/profile`, profileForm);
      if (res.data.success) {
        addToast('Profile details saved successfully!', 'success');
      }
    } catch (err) {
      addToast('Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // KPIs
  const pendingApps = appointments.filter(a => a.status === 'pending').length;
  const approvedApps = appointments.filter(a => a.status === 'approved').length;
  const completedApps = appointments.filter(a => a.status === 'completed').length;
  const paidEarnings = appointments
    .filter(a => a.paymentStatus === 'paid')
    .reduce((sum, a) => sum + (parseFloat(a.service_id?.price) || 0), 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <ToastContainer toasts={toasts} removeToast={(id) => setToasts(t => t.filter(x => x.id !== id))} />

      {/* Header Banner */}
      <div 
        className="app-card" 
        style={{ 
          padding: '2rem', 
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(99, 102, 241, 0.15))',
          borderColor: 'rgba(168, 85, 247, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '16px', 
            background: 'rgba(168, 85, 247, 0.2)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--secondary)',
            boxShadow: '0 8px 20px rgba(168, 85, 247, 0.25)'
          }}>
            <Sparkles size={32} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.85rem', marginBottom: '0.25rem', fontFamily: 'Outfit' }}>
              Expert Professional Schedule
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
              Manage your availability, review client bookings, and track your service earnings.
            </p>
          </div>
        </div>
      </div>

      {/* EXPERT ACCOUNT ACTIVATION BANNER */}
      {user?.role === 'expert' && user?.isActivated === false && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(239, 68, 68, 0.08))',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ padding: '0.6rem', background: '#fef3c7', borderRadius: '12px', color: '#b45309' }}>
              <Clock size={22} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', color: '#b45309', fontFamily: 'Outfit' }}>
                Action Required: ₦3,000 Provider Account Activation
              </h4>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Your provider workspace is pending activation. Pay the one-time ₦3,000 verification fee via Paystack to unlock client bookings.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowActivationModal(true)}
            className="btn btn-primary"
            style={{ background: '#d97706', borderColor: '#b45309', padding: '0.65rem 1.35rem', fontSize: '0.875rem', fontWeight: 700 }}
          >
            Activate Now (₦3,000)
          </button>
        </div>
      )}

      {/* KPI Stats Grid - Bento */}
      <div className="bento-grid">
        <div className="bento-card bento-span-3" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CONFIRMED</span>
            <div style={{ padding: '0.4rem', background: 'rgba(79, 70, 229, 0.1)', borderRadius: '8px', color: 'var(--primary)' }}>
              <CalendarCheck size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--primary)', fontFamily: 'Outfit' }}>{approvedApps}</h2>
        </div>

        <div className="bento-card bento-span-3" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PENDING</span>
            <div style={{ padding: '0.4rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: '#d97706' }}>
              <Clock size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '2rem', margin: 0, color: '#d97706', fontFamily: 'Outfit' }}>{pendingApps}</h2>
        </div>

        <div className="bento-card bento-span-3" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PAID EARNINGS</span>
            <div style={{ padding: '0.4rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: '#059669' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '2rem', margin: 0, color: '#059669', fontFamily: 'Outfit' }}>₦{paidEarnings.toLocaleString()}</h2>
        </div>

        {/* Wallet Balance - Prominent Gradient Card */}
        <div className="bento-card bento-span-3" style={{ padding: '1.35rem', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', opacity: 0.8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>WALLET BALANCE</span>
            <Wallet size={18} style={{ opacity: 0.8 }} />
          </div>
          <h2 style={{ fontSize: '2rem', margin: 0, color: 'white', fontFamily: 'Outfit' }}>₦{walletBalance.toLocaleString()}</h2>
        </div>
      </div>

      {/* Wallet Transaction Log Card */}
      {walletTransactions.filter(tx => tx.type === 'earning').length > 0 && (
        <div className="bento-card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ padding: '0.45rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: '#059669' }}>
                <Wallet size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Earnings Wallet Log</h3>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '200px', overflowY: 'auto' }}>
            {walletTransactions.filter(tx => tx.type === 'earning').reverse().map((tx, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                background: '#f8fafc',
                border: '1px solid var(--border-light)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowDownLeft size={15} />
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block' }}>{tx.description}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(tx.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <strong style={{ color: '#059669', fontSize: '0.95rem' }}>+₦{tx.amount.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABS CONTAINER */}
      <div className="app-card" style={{ padding: '0.5rem', display: 'inline-flex', gap: '0.5rem', borderBottom: 'none', borderRadius: '14px', marginBottom: '-1rem' }}>
        <button
          onClick={() => setSearchParams({ tab: 'appointments' })}
          className={`btn ${activeTab === 'appointments' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem' }}
        >
          <CalendarRange size={16} /> My Schedule ({appointments.length})
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'services' })}
          className={`btn ${activeTab === 'services' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem' }}
        >
          <Briefcase size={16} /> My Services ({services.length})
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'availability' })}
          className={`btn ${activeTab === 'availability' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem' }}
        >
          <Clock size={16} /> Working Hours & Availability
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'profile' })}
          className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem' }}
        >
          <User size={16} /> Profile Settings
        </button>
      </div>

      {/* MAIN TAB CONTENT */}
      <div>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading schedule...</div>
        ) : (
          <>
            {/* APPOINTMENTS TAB */}
            {activeTab === 'appointments' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="app-card">
                <div className="card-header">
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Assigned Appointments</h3>
                </div>

                <div className="card-body" style={{ padding: '1rem 1.5rem' }}>
                  {appointments.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {appointments.map((app) => (
                        <div 
                          key={app.id || app._id}
                          style={{
                            padding: '1.25rem',
                            borderRadius: '16px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--border-light)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '1rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ padding: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: 'var(--primary)' }}>
                              <User size={24} />
                            </div>
                            <div>
                              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.975rem', display: 'block', fontFamily: 'Outfit' }}>
                                {app.user_id?.name || app.client_name || 'Client'}
                              </span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Service: <strong>{app.service_id?.name || 'Session'}</strong>
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Clock size={14} color="var(--primary)" /> {app.date} at {app.time}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              Fee: <strong>₦{(app.service_id?.price || 0).toLocaleString()}</strong>
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <span className={`status-badge status-${app.status}`}>
                              {app.status}
                            </span>

                            {/* Chat Button */}
                            <button
                              type="button"
                              onClick={() => setChatAppointment(app)}
                              className="btn btn-secondary"
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.78rem',
                                color: 'var(--primary)',
                                background: 'rgba(99, 102, 241, 0.1)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontWeight: 600
                              }}
                            >
                              <MessageSquare size={13} /> Chat with Client
                            </button>

                            {/* Calendar Exports */}
                            <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
                              <a
                                href={getGoogleCalendarUrl(app)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
                                title="Add to Google Calendar"
                              >
                                <Calendar size={13} color="var(--primary)" /> Cal
                              </a>
                              <button
                                type="button"
                                onClick={() => downloadIcsFile(app)}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                title="Download .ics Calendar File"
                              >
                                <Download size={13} color="var(--secondary)" /> .ics
                              </button>
                            </div>

                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              {app.status !== 'approved' && app.status !== 'completed' && (
                                <button 
                                  onClick={() => handleUpdateStatus(app.id || app._id, 'approved')}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: 'var(--success)' }}
                                >
                                  <CheckCircle size={14} /> Accept
                                </button>
                              )}
                              {app.status === 'approved' && (
                                <button 
                                  onClick={() => handleUpdateStatus(app.id || app._id, 'completed')}
                                  className="btn btn-primary"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                                >
                                  <CheckCircle size={14} /> Complete
                                </button>
                              )}
                              {app.status !== 'cancelled' && (
                                <button 
                                  onClick={() => handleUpdateStatus(app.id || app._id, 'cancelled')}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#ef4444' }}
                                >
                                  <XCircle size={14} /> Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No assigned client appointments found.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* SERVICES OFFERED TAB */}
            {activeTab === 'services' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="app-card">
                <div className="card-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Briefcase size={20} color="var(--secondary)" />
                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>My Offered Services</h3>
                  </div>

                  <button 
                    onClick={openNewServiceModal}
                    className="btn btn-primary" 
                    style={{ padding: '0.65rem 1.25rem', fontSize: '0.875rem' }}
                  >
                    <Plus size={16} /> Add New Service
                  </button>
                </div>

                <div className="card-body" style={{ padding: '1.5rem' }}>
                  <div className="grid-layout grid-cols-1 md:grid-cols-3" style={{ gap: '1.5rem' }}>
                    {services.map((service) => (
                      <div 
                        key={service._id || service.id}
                        style={{
                          padding: '1.5rem',
                          borderRadius: '16px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-light)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '1rem'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <h4 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'Outfit' }}>{service.name}</h4>
                            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary)' }}>₦{service.price?.toLocaleString()}</span>
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: '0 0 1rem' }}>
                            {service.description || 'Expert appointment service.'}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Clock size={14} /> {service.duration || 45} mins
                            </span>
                            <span>•</span>
                            <span>{service.location || 'Main Studio'}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                          <button 
                            onClick={() => handleEditService(service)} 
                            className="btn btn-secondary" 
                            style={{ flex: 1, padding: '0.45rem', fontSize: '0.8rem' }}
                          >
                            <Edit size={14} /> Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteService(service._id || service.id)} 
                            className="btn btn-outline" 
                            style={{ padding: '0.45rem 0.75rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* AVAILABILITY & WORKING HOURS TAB */}
            {activeTab === 'availability' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="app-card" style={{ maxWidth: '680px' }}>
                <div className="card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', color: 'var(--primary)' }}>
                      <Clock size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Availability & Working Hours</h3>
                      <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                        Control which days and hours clients can book you for
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card-body" style={{ padding: '1.5rem' }}>
                  <form onSubmit={handleSaveAvailability}>
                    {/* Daily Toggles */}
                    <div style={{ marginBottom: '1.75rem' }}>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                        Available Days of the Week
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
                        {ALL_DAYS.map((day) => {
                          const isActive = workingDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleDay(day)}
                              style={{
                                padding: '0.85rem 0.75rem',
                                borderRadius: '12px',
                                border: isActive ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                                background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                fontWeight: isActive ? 700 : 500,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.35rem',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>{day}</span>
                              <span style={{
                                fontSize: '0.7rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '9999px',
                                background: isActive ? '#10b981' : '#64748b',
                                color: '#ffffff'
                              }}>
                                {isActive ? 'Open' : 'Off'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Working Hours Pickers */}
                    <div style={{ marginBottom: '1.75rem' }}>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                        Daily Service Hours (Start — End)
                      </label>
                      <div className="grid-layout grid-cols-2" style={{ gap: '1rem' }}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Sun size={14} color="#f59e0b" /> Opening Time
                          </label>
                          <input
                            type="time"
                            value={workingHours.start}
                            onChange={(e) => setWorkingHours({ ...workingHours, start: e.target.value })}
                            required
                            style={{ padding: '0.75rem 1rem', borderRadius: '10px' }}
                          />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Moon size={14} color="#6366f1" /> Closing Time
                          </label>
                          <input
                            type="time"
                            value={workingHours.end}
                            onChange={(e) => setWorkingHours({ ...workingHours, end: e.target.value })}
                            required
                            style={{ padding: '0.75rem 1rem', borderRadius: '10px' }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        disabled={savingAvailability}
                        className="btn btn-primary"
                        style={{ padding: '0.75rem 1.75rem' }}
                      >
                        {savingAvailability ? 'Saving Schedule...' : 'Save Availability'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="app-card" style={{ maxWidth: '600px' }}>
                <div className="card-header">
                  <h3 style={{ margin: 0 }}>Expert Profile Settings</h3>
                </div>
                <div className="card-body">
                  <form onSubmit={submitProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label>Expert Display Name</label>
                      <input 
                        type="text" 
                        value={profileForm.name} 
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} 
                        required 
                      />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label>Contact Phone</label>
                      <input 
                        type="text" 
                        value={profileForm.phone} 
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} 
                      />
                    </div>
                    <button type="submit" disabled={savingProfile} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                      {savingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* CREATE / EDIT SERVICE MODAL */}
      <AnimatePresence>
        {isServiceModalOpen && (
          <div className="modal-overlay" onClick={() => setIsServiceModalOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-card"
              style={{ padding: '2rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'Outfit' }}>
                  {editingServiceId ? 'Edit Service' : 'Add New Service'}
                </h3>
                <button onClick={() => setIsServiceModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={submitService} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Service Title</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={serviceForm.name} 
                    onChange={handleServiceChange} 
                    required 
                  />
                </div>

                <div className="grid-layout grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Offering Type</label>
                    <select
                      name="type"
                      value={serviceForm.type || 'single'}
                      onChange={handleServiceChange}
                      style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border-light)', width: '100%' }}
                    >
                      <option value="single">🟢 Single Service</option>
                    </select>
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Category</label>
                    <select
                      name="category"
                      value={serviceForm.category || 'Hair Packages'}
                      onChange={handleServiceChange}
                      style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border-light)', width: '100%' }}
                    >
                      <option value="Hair Packages">Hair Packages</option>
                      <option value="Nail Packages">Nail Packages</option>
                      <option value="Lash Packages">Lash Packages</option>
                      <option value="Makeup Packages">Makeup Packages</option>
                      <option value="Male Grooming">Male Grooming</option>
                      <option value="Academic">Academic</option>
                      <option value="Technical">Technical</option>
                    </select>
                  </div>
                </div>

                <div className="grid-layout grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Price (₦ Naira)</label>
                    <input 
                      type="number" 
                      name="price" 
                      value={serviceForm.price} 
                      onChange={handleServiceChange} 
                      required 
                    />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Duration (Minutes)</label>
                    <input 
                      type="number" 
                      name="duration" 
                      value={serviceForm.duration} 
                      onChange={handleServiceChange} 
                      required 
                    />
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Service Location</label>
                  <input 
                    type="text" 
                    name="location" 
                    value={serviceForm.location} 
                    onChange={handleServiceChange} 
                  />
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Service Description</label>
                  <textarea 
                    rows="3" 
                    name="description" 
                    value={serviceForm.description} 
                    onChange={handleServiceChange} 
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setIsServiceModalOpen(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingServiceId ? 'Update Service' : 'Create Service'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CHAT MODAL */}
      <AppointmentChatModal
        isOpen={Boolean(chatAppointment)}
        onClose={() => setChatAppointment(null)}
        appointment={chatAppointment}
      />

      {/* EXPERT PAYSTACK ACTIVATION MODAL (₦3,000) */}
      <ExpertActivationModal
        isOpen={user?.role === 'expert' && (!user?.isActivated || showActivationModal)}
        user={user}
        onActivated={() => {
          setShowActivationModal(false);
          if (refreshUser) refreshUser();
          addToast('Account activated successfully! Your workspace is unlocked.', 'success');
        }}
      />

    </div>
  );
};

export default ExpertDashboard;
