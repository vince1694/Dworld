import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  CalendarPlus, 
  ListChecks, 
  CalendarX2, 
  CheckCircle, 
  Clock, 
  MapPin, 
  User, 
  Settings, 
  Sparkles, 
  ShieldCheck, 
  CalendarCheck,
  Search,
  Filter,
  Eye,
  X,
  ArrowRight,
  TrendingUp,
  Award,
  Bell,
  Trash2,
  Star,
  MessageSquare,
  Download,
  Calendar,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BookingWizardModal from '../components/BookingWizardModal';
import ReviewModal from '../components/ReviewModal';
import AppointmentChatModal from '../components/AppointmentChatModal';
import { getGoogleCalendarUrl, downloadIcsFile } from '../utils/calendar';

import { API_URL } from '../config/api';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI Controls
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [preselectedServiceId, setPreselectedServiceId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [chatAppointment, setChatAppointment] = useState(null);

  const { notify } = useNotify();
  const addToast = (message, type = 'success') => {
    if (type === 'error') notify.error(message);
    else if (type === 'info') notify.info(message);
    else if (type === 'warning') notify.warning(message);
    else notify.success(message);
  };

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    fetchData();
    const bookParam = searchParams.get('book');
    if (bookParam) {
      navigate(`/book?serviceId=${bookParam}`);
    }

    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (reference) {
      axios.post(`${API_URL}/payments/verify`, { reference })
        .then(res => {
          if (res.data.success) {
            addToast(res.data.message || 'Payment confirmed successfully! 🎉', 'success');
            fetchData();
            navigate('/dashboard', { replace: true });
          }
        })
        .catch(err => {
          console.warn('Payment verify notice:', err);
        });
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [servicesRes, appointmentsRes] = await Promise.all([
        axios.get(`${API_URL}/services`),
        axios.get(`${API_URL}/appointments/my-appointments`)
      ]);
      
      if (servicesRes.data.success) {
        setServices(servicesRes.data.data);
      }
      
      if (appointmentsRes.data.success) {
        setAppointments(appointmentsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good morning';
    if (hrs < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const openBookingForService = (serviceId) => {
    navigate(serviceId ? `/book?serviceId=${serviceId}` : '/book');
  };

  const handleCancelAppointment = async (appointmentId) => {
    try {
      const res = await axios.patch(`${API_URL}/appointments/${appointmentId}/status`, { status: 'cancelled' });
      if (res.data.success) {
        addToast('Appointment cancelled successfully.', 'info');
        setSelectedAppointment(null);
        fetchData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to cancel appointment.', 'error');
    }
  };

  const [paying, setPaying] = useState(false);

  const startDirectAppointmentPaystack = async (appointment) => {
    const appointmentId = appointment.id || appointment._id;
    const price = parseFloat(appointment.service_id?.price || 0);

    // 1. Ensure Paystack inline script is ready
    if (typeof window.PaystackPop === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.head.appendChild(script);
      await new Promise((res) => { script.onload = res; script.onerror = res; });
    }

    let publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';
    try {
      const configRes = await axios.get(`${API_URL}/payments/config`);
      if (configRes.data.success && configRes.data.publicKey) {
        publicKey = configRes.data.publicKey;
      }
    } catch (e) {}

    let popupOpened = false;
    if (typeof window.PaystackPop !== 'undefined') {
      try {
        const handler = window.PaystackPop.setup({
          key: publicKey,
          email: user?.email || 'client@dworld.com',
          amount: Math.round(price * 100),
          currency: 'NGN',
          ref: 'APT-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          metadata: {
            purpose: 'appointment_pay',
            appointment_id: appointmentId,
            user_id: user?.id || user?._id
          },
          callback: async (response) => {
            try {
              const verifyRes = await axios.post(`${API_URL}/payments/verify`, {
                reference: response.reference
              });
              if (verifyRes.data.success) {
                addToast('Payment successful! Expert payout released.', 'success');
                setSelectedAppointment(null);
                fetchData();
              } else {
                addToast(verifyRes.data.message || 'Payment verification failed', 'error');
              }
            } catch (err) {
              addToast(err.response?.data?.message || 'Verification error', 'error');
            }
          }
        });
        handler.openIframe();
        popupOpened = true;
      } catch (e) {
        console.warn('Paystack inline popup blocked or failed:', e);
      }
    }

    if (!popupOpened) {
      const initRes = await axios.post(`${API_URL}/payments/initialize`, {
        amount: price,
        purpose: 'appointment_pay',
        appointment_id: appointmentId,
        email: user?.email,
        name: user?.name
      });
      if (initRes.data.success && initRes.data.data?.authorization_url) {
        window.location.href = initRes.data.data.authorization_url;
      } else {
        throw new Error('Payment initialization failed');
      }
    }
  };

  const handlePayAppointment = async (appointment) => {
    if (!appointment) return;
    const appointmentId = appointment.id || appointment._id;

    try {
      setPaying(true);
      // First attempt: pay from wallet balance
      const res = await axios.post(`${API_URL}/appointments/${appointmentId}/pay`);
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setSelectedAppointment(null);
        fetchData();
        return;
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Payment failed.';
      // If wallet balance is insufficient, start Paystack direct card/bank checkout!
      if (errMsg.toLowerCase().includes('insufficient') || errMsg.toLowerCase().includes('wallet')) {
        addToast('Starting Paystack checkout...', 'info');
        try {
          await startDirectAppointmentPaystack(appointment);
        } catch (paystackErr) {
          addToast('Could not start direct checkout. Please fund your wallet.', 'error');
        }
      } else {
        addToast(errMsg, 'error');
      }
    } finally {
      setPaying(false);
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    try {
      const res = await axios.delete(`${API_URL}/appointments/${appointmentId}`);
      if (res.data.success) {
        addToast('Booking deleted successfully.', 'info');
        setSelectedAppointment(null);
        fetchData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete booking.', 'error');
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all completed and cancelled appointment history?')) return;
    try {
      const res = await axios.delete(`${API_URL}/appointments/clear-history`);
      if (res.data.success) {
        addToast(res.data.message, 'info');
        fetchData();
      }
    } catch (err) {
      addToast('Failed to clear booking history.', 'error');
    }
  };

  const submitProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const res = await axios.put(`${API_URL}/auth/profile`, profileForm);
      if (res.data.success) {
        addToast('Profile settings saved successfully!', 'success');
      }
    } catch (err) {
      addToast('Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Compute metrics
  const pendingCount = appointments.filter(a => a.status === 'pending').length;
  const approvedCount = appointments.filter(a => a.status === 'approved').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;
  const totalCount = appointments.length;

  const nextUpcoming = appointments.find(a => a.status === 'approved' || a.status === 'pending');

  // Filtered Appointments
  const filteredAppointments = appointments.filter(app => {
    const matchesStatus = filterStatus === 'all' ? true : app.status === filterStatus;
    const serviceName = app.service_id?.name || '';
    const matchesSearch = serviceName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.date.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Booking Wizard Modal */}
      <BookingWizardModal 
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        preselectedServiceId={preselectedServiceId}
        onBookingSuccess={() => {
          addToast('Booking successfully placed!', 'success');
          fetchData();
        }}
      />

      {/* Expert Review Modal */}
      <ReviewModal 
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        appointment={selectedAppointment}
        onReviewSubmitted={(msg) => {
          addToast(msg, 'success');
          setSelectedAppointment(null);
          fetchData();
        }}
      />

      {/* LIGHT MODE BENTO HERO BANNER */}
      <div className="bento-card" style={{ padding: '1.75rem', background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(124, 58, 237, 0.08), rgba(2, 132, 199, 0.06))', borderColor: 'rgba(79, 70, 229, 0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
            <div style={{ 
              width: '50px', 
              height: '50px', 
              borderRadius: '14px', 
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 6px 18px rgba(79, 70, 229, 0.25)',
              flexShrink: 0
            }}>
              <Sparkles size={24} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.15rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', margin: 0, fontFamily: 'Outfit', lineHeight: 1.1 }}>
                  {getGreeting()}, {user?.name?.split(' ')[0] || 'User'}
                </h1>
                {nextUpcoming && (
                  <span style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', padding: '0.2rem 0.55rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                    <Clock size={11} /> Next: {nextUpcoming.date}
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                Welcome to your D.WORLD workspace. Manage bookings in real-time.
              </p>
            </div>
          </div>

          <button 
            onClick={() => navigate('/book')}
            className="btn btn-primary"
            style={{ padding: '0.8rem 1.5rem', fontSize: '0.9rem', flexShrink: 0 }}
          >
            <CalendarPlus size={17} /> Book Appointment
          </button>
        </div>
      </div>

      {/* BENTO STATS ROW */}
      <div className="bento-grid">
        <div className="bento-card bento-span-3" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>CONFIRMED</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarCheck size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--primary)', fontFamily: 'Outfit' }}>{approvedCount}</h2>
        </div>

        <div className="bento-card bento-span-3" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>PENDING</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--warning)', fontFamily: 'Outfit' }}>{pendingCount}</h2>
        </div>

        <div className="bento-card bento-span-3" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>COMPLETED</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--success)', fontFamily: 'Outfit' }}>{completedCount}</h2>
        </div>

        <div className="bento-card bento-span-3" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL BOOKINGS</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-main)', fontFamily: 'Outfit' }}>{totalCount}</h2>
        </div>
      </div>

      {/* BENTO MAIN GRID */}
      {activeTab === 'overview' ? (
        <div className="bento-grid">
          
          {/* BENTO SPAN 7: SCHEDULE TIMELINE */}
          <div className="bento-card bento-span-7">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '8px', color: 'var(--secondary)' }}>
                  <ListChecks size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>My Appointments</h3>
                  <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>Real-time booking schedule</p>
                </div>
              </div>

              {/* Status Filter Chips & Clear History */}
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: '0.1rem' }}>
                <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center', whiteSpace: 'nowrap', minWidth: 'max-content' }}>
                {['all', 'pending', 'approved', 'completed', 'cancelled'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '9999px',
                      border: '1px solid var(--border-light)',
                      background: filterStatus === status ? 'var(--primary)' : 'rgba(255, 255, 255, 0.02)',
                      color: filterStatus === status ? 'white' : 'var(--text-muted)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      minHeight: '30px'
                    }}
                  >
                    {status}
                  </button>
                ))}
                
                {appointments.some(a => a.status === 'completed' || a.status === 'cancelled') && (
                  <button
                    onClick={handleClearHistory}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '9999px',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      background: 'rgba(239, 68, 68, 0.08)',
                      color: '#dc2626',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      marginLeft: '0.25rem',
                      minHeight: '30px'
                    }}
                  >
                    <Trash2 size={12} /> Clear
                  </button>
                )}
                </div>
              </div>
            </div>

            <div className="card-body" style={{ padding: 0 }}>
              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-subtle)' }}>
                  Loading schedule...
                </div>
              ) : filteredAppointments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filteredAppointments.map((app) => (
                    <div 
                      key={app.id || app._id}
                      onClick={() => setSelectedAppointment(app)}
                      className="hover-card-select appt-list-item"
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '1.1rem 1.25rem',
                        borderBottom: '1px solid var(--border-light)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '11px',
                          background: 'rgba(99, 102, 241, 0.1)',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--primary)',
                          flexShrink: 0
                        }}>
                          <CalendarCheck size={18} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', display: 'block', fontFamily: 'Outfit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {app.service_id?.name || 'Appointment'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Clock size={12} color="var(--primary)" /> {app.date} at {app.time}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <User size={12} color="var(--secondary)" /> {app.service_id?.duration || 45} mins
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="appt-list-item-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setChatAppointment(app);
                          }}
                          style={{
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            color: 'var(--primary)',
                            padding: '0.35rem 0.6rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            minHeight: '32px'
                          }}
                          title="Message Stylist"
                        >
                          <MessageSquare size={12} /> Chat
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAppointment(app.id || app._id);
                          }}
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#ef4444',
                            padding: '0.35rem 0.55rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            minHeight: '32px'
                          }}
                          title="Delete Booking"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                        <span className={`status-badge status-${app.status}`}>
                          {app.status}
                        </span>
                        <Eye size={15} color="var(--text-subtle)" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '4rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <CalendarX2 size={48} style={{ color: 'var(--border-strong)' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No appointments match your filter.</p>
                  <button 
                    onClick={() => navigate('/book')}
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.85rem' }}
                  >
                    Schedule One Now
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* BENTO SPAN 5: FEATURED SERVICES SHOWCASE */}
          <div className="bento-card bento-span-5">
            <div className="card-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Featured Services</h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {services.slice(0, 4).map(service => {
                const serviceId = String(service._id || service.id);
                return (
                  <div 
                    key={serviceId}
                    onClick={() => openBookingForService(serviceId)}
                    style={{
                      padding: '1rem 1.25rem',
                      borderRadius: '14px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-light)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s ease',
                      pointerEvents: 'auto'
                    }}
                    className="hover-card-select"
                  >
                    <div>
                      <h4 style={{ margin: '0 0 0.2rem', fontSize: '0.95rem', fontFamily: 'Outfit' }}>{service.name}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 600 }}>₦{service.price?.toLocaleString()} • {service.duration || 45}m</span>
                    </div>
                    <span style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '10px',
                      background: 'rgba(99, 102, 241, 0.12)',
                      color: 'var(--primary)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}>
                      Book <ArrowRight size={12} />
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Campus Share / Referral Card */}
            <div style={{
              margin: '1rem',
              padding: '1.25rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(124, 58, 237, 0.08))',
              border: '1px solid rgba(79, 70, 229, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🤝</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>
                  Invite LCU Course Mates
                </strong>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.85rem', lineHeight: 1.5 }}>
                Share D.WORLD with friends in your department or hostel for fast, cashless campus styling.
              </p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin);
                  addToast('Invite link copied! Share with your course mates on WhatsApp 🚀', 'success');
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', width: '100%', justifyContent: 'center', gap: '0.4rem', padding: '0.55rem' }}
              >
                <Share2 size={13} /> Copy Campus Invite Link
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* PROFILE SETTINGS TAB */
        <div className="bento-card" style={{ maxWidth: '650px' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', color: 'var(--text-main)' }}>
                <Settings size={20} />
              </div>
              <h3 style={{ margin: 0 }}>Profile Settings</h3>
            </div>
          </div>

          <div className="card-body">
            <form onSubmit={submitProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={profileForm.name} 
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} 
                  required 
                />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Phone Number</label>
                <input 
                  type="text" 
                  value={profileForm.phone} 
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} 
                  placeholder="+1 (555) 000-0000" 
                />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Email Address</label>
                <input 
                  type="email" 
                  value={user?.email || ''} 
                  disabled 
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={savingProfile}
                className="btn btn-primary" 
                style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
              >
                {savingProfile ? 'Saving...' : 'Save Profile Settings'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* APPOINTMENT DETAILS MODAL DRAWER */}
      <AnimatePresence>
        {selectedAppointment && (
          <div className="modal-overlay" onClick={() => setSelectedAppointment(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-card"
              style={{ padding: '2rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className={`status-badge status-${selectedAppointment.status}`}>
                    {selectedAppointment.status}
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'Outfit' }}>
                    {selectedAppointment.service_id?.name || 'Appointment'}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedAppointment(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255, 255, 255, 0.02)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Scheduled Date:</span>
                  <strong style={{ color: 'var(--primary)' }}>{selectedAppointment.date}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Time Slot:</span>
                  <strong style={{ color: 'var(--accent)' }}>{selectedAppointment.time}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Service Fee:</span>
                  <strong style={{ color: 'var(--secondary)' }}>₦{(selectedAppointment.service_id?.price || 0).toLocaleString()}</strong>
                </div>
                {selectedAppointment.notes && (
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Special Notes:</span>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-main)' }}>{selectedAppointment.notes}</p>
                  </div>
                )}

                {/* Calendar Sync Options */}
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.85rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                    📅 Sync to Calendar (with 30m reminder)
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <a
                      href={getGoogleCalendarUrl(selectedAppointment)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
                    >
                      <Calendar size={14} color="var(--primary)" /> Google Calendar
                    </a>
                    <button
                      type="button"
                      onClick={() => downloadIcsFile(selectedAppointment)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Download size={14} color="var(--secondary)" /> Apple / Outlook (.ics)
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {selectedAppointment.service_id?.stylist_id?.phone && (
                  <a
                    href={`https://wa.me/${selectedAppointment.service_id.stylist_id.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello! I have a booking on D.WORLD for ${selectedAppointment.service_id?.name || 'styling'} on ${selectedAppointment.date} at ${selectedAppointment.time}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', borderColor: 'rgba(34, 197, 94, 0.3)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    💬 WhatsApp Stylist
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setChatAppointment(selectedAppointment);
                  }}
                  className="btn btn-secondary"
                  style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', borderColor: 'rgba(99, 102, 241, 0.3)', fontWeight: 600 }}
                >
                  <MessageSquare size={16} /> Live Chat
                </button>

                {(selectedAppointment.status === 'completed' || selectedAppointment.status === 'cancelled') && (
                  <button
                    type="button"
                    onClick={() => {
                      const sId = selectedAppointment.service_id?._id || selectedAppointment.service_id?.id;
                      setSelectedAppointment(null);
                      openBookingForService(sId);
                    }}
                    className="btn btn-primary"
                    style={{ fontWeight: 600 }}
                  >
                    <CalendarPlus size={16} /> Rebook Service
                  </button>
                )}

                {(selectedAppointment.status === 'approved' || selectedAppointment.status === 'completed') && selectedAppointment.paymentStatus !== 'paid' && (
                  <button 
                    disabled={paying}
                    onClick={() => handlePayAppointment(selectedAppointment)}
                    className="btn btn-primary"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: 800, minHeight: '44px' }}
                  >
                    {paying ? 'Processing Payment...' : `Pay Expert (₦${(selectedAppointment.service_id?.price || 0).toLocaleString()})`}
                  </button>
                )}

                {selectedAppointment.paymentStatus === 'paid' && (
                  <>
                    <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '0.4rem 0.85rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem' }}>
                      Payment Released to Expert ✓
                    </span>
                    <button
                      onClick={() => setIsReviewModalOpen(true)}
                      className="btn btn-secondary"
                      style={{ border: '1px solid #f59e0b', color: '#d97706', background: '#fffbe8', fontWeight: 700 }}
                    >
                      <Star size={16} fill="#d97706" /> Leave Review
                    </button>
                  </>
                )}

                {selectedAppointment.status === 'pending' && (
                  <button 
                    onClick={() => handleCancelAppointment(selectedAppointment.id || selectedAppointment._id)}
                    className="btn btn-outline"
                    style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                  >
                    Cancel Booking
                  </button>
                )}

                <button 
                  onClick={() => handleDeleteAppointment(selectedAppointment.id || selectedAppointment._id)}
                  className="btn btn-outline"
                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Trash2 size={15} /> Delete Booking
                </button>

                <button onClick={() => setSelectedAppointment(null)} className="btn btn-secondary">
                  Close Window
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IN-APP CHAT MODAL */}
      <AppointmentChatModal
        isOpen={Boolean(chatAppointment)}
        onClose={() => setChatAppointment(null)}
        appointment={chatAppointment}
      />

    </div>
  );
};

export default Dashboard;
