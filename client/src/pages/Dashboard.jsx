import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  CalendarPlus, 
  ListChecks, 
  CalendarX2, 
  CheckCircle, 
  CheckCircle2,
  Clock, 
  MapPin, 
  User, 
  UserCheck,
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
  Share2,
  RotateCcw,
  Camera,
  ZoomIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BookingWizardModal from '../components/BookingWizardModal';
import ReviewModal from '../components/ReviewModal';
import AppointmentChatModal from '../components/AppointmentChatModal';
import ConfirmModal from '../components/ConfirmModal';
import ImageLightboxModal from '../components/ImageLightboxModal';
import { getGoogleCalendarUrl, downloadIcsFile } from '../utils/calendar';

import { API_URL } from '../config/api';

const Dashboard = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [services, setServices] = useState(() => {
    // Restore cached services instantly — avoid re-fetching on every visit
    try {
      const raw = sessionStorage.getItem('dworld_services');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [experts, setExperts] = useState(() => {
    try {
      const raw = sessionStorage.getItem('dworld_experts');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [appointments, setAppointments] = useState([]);
  // loading=false immediately — we show skeleton shimmer on individual sections
  const [loading, setLoading] = useState(false);
  const [apptLoading, setApptLoading] = useState(true);

  // Lightbox Modal State
  const [lightbox, setLightbox] = useState({
    isOpen: false,
    imageUrl: '',
    title: '',
    subtitle: ''
  });

  // Avatar Upload State
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);
  
  // UI Controls
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [preselectedServiceId, setPreselectedServiceId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [chatAppointment, setChatAppointment] = useState(null);

  // In-app Confirmation Modal & Reschedule States
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger',
    onConfirm: null
  });

  const [rescheduleData, setRescheduleData] = useState({
    isOpen: false,
    appointment: null,
    date: '',
    time: '10:00',
    submitting: false
  });

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
    // Fast path: fetch appointments immediately (they change frequently)
    setApptLoading(true);
    try {
      const [appointmentsRes] = await Promise.all([
        axios.get(`${API_URL}/appointments/my-appointments`),
      ]);
      if (appointmentsRes.data.success) {
        setAppointments(appointmentsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch appointments', err);
    } finally {
      setApptLoading(false);
    }

    // Background: revalidate services + experts (stale-while-revalidate pattern)
    try {
      const [servicesRes, expertsRes] = await Promise.all([
        axios.get(`${API_URL}/services`),
        axios.get(`${API_URL}/auth/experts`)
      ]);
      if (servicesRes.data?.success) {
        setServices(servicesRes.data.data);
        sessionStorage.setItem('dworld_services', JSON.stringify(servicesRes.data.data));
      }
      if (expertsRes?.data?.success) {
        setExperts(expertsRes.data.data || []);
        sessionStorage.setItem('dworld_experts', JSON.stringify(expertsRes.data.data || []));
      }
    } catch (err) {
      console.error('Failed to revalidate services/experts', err);
    }
  };

  const openLightbox = (imageUrl, title = 'Profile Picture', subtitle = 'Full HD View') => {
    if (!imageUrl) return;
    setLightbox({
      isOpen: true,
      imageUrl,
      title,
      subtitle
    });
  };

  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      addToast('Image size exceeds 10MB limit. Please choose a smaller photo.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      try {
        setAvatarUploading(true);
        const res = await axios.post(`${API_URL}/auth/avatar`, { avatar: base64Data });
        if (res.data.success) {
          const newAvatar = res.data.avatar;
          setUser(prev => ({ ...prev, avatar: newAvatar }));
          addToast('Profile photo updated successfully! 📸', 'success');
        }
      } catch (err) {
        addToast(err.response?.data?.message || 'Failed to upload profile picture.', 'error');
      } finally {
        setAvatarUploading(false);
      }
    };
    reader.readAsDataURL(file);
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

  const handleDeleteAppointment = (appointmentId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Booking Record?',
      message: 'Are you sure you want to delete this booking? If this appointment was paid and not yet completed, the full payment amount will be automatically refunded to your wallet.',
      confirmText: 'Delete Booking',
      cancelText: 'Keep Booking',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await axios.delete(`${API_URL}/appointments/${appointmentId}`);
          if (res.data.success) {
            addToast('Booking deleted successfully.', 'info');
            setSelectedAppointment(null);
            fetchData();
          }
        } catch (err) {
          addToast(err.response?.data?.message || 'Failed to delete booking.', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleClearHistory = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear Past Booking History?',
      message: 'Are you sure you want to permanently clear all completed and cancelled booking records from your history?',
      confirmText: 'Clear History',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: async () => {
        try {
          const res = await axios.delete(`${API_URL}/appointments/clear-history`);
          if (res.data.success) {
            addToast(res.data.message || 'Booking history cleared.', 'info');
            fetchData();
          }
        } catch (err) {
          addToast('Failed to clear booking history.', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const openRescheduleModal = (apt) => {
    setRescheduleData({
      isOpen: true,
      appointment: apt,
      date: apt.date || '',
      time: apt.time || '10:00',
      submitting: false
    });
  };

  const handleConfirmReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleData.date || !rescheduleData.time) {
      addToast('Please select both a new date and time.', 'warning');
      return;
    }

    try {
      setRescheduleData(prev => ({ ...prev, submitting: true }));
      const aptId = rescheduleData.appointment._id || rescheduleData.appointment.id;
      const res = await axios.patch(`${API_URL}/appointments/${aptId}/reschedule`, {
        date: rescheduleData.date,
        time: rescheduleData.time
      });

      if (res.data.success) {
        addToast(res.data.message || 'Appointment rescheduled successfully!', 'success');
        setRescheduleData(prev => ({ ...prev, isOpen: false }));
        if (selectedAppointment && (selectedAppointment._id === aptId || selectedAppointment.id === aptId)) {
          setSelectedAppointment(res.data.data);
        }
        fetchData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to reschedule appointment.', 'error');
    } finally {
      setRescheduleData(prev => ({ ...prev, submitting: false }));
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

      {/* LIGHT MODE BENTO HERO BANNER WITH PROFILE PICTURE */}
      <div className="bento-card" style={{ padding: '1.75rem', background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(124, 58, 237, 0.08), rgba(2, 132, 199, 0.06))', borderColor: 'rgba(79, 70, 229, 0.15)' }}>
        {/* Hidden input for changing profile photo directly from dashboard banner */}
        <input 
          type="file"
          ref={avatarInputRef}
          accept="image/*"
          onChange={handleAvatarFileSelect}
          style={{ display: 'none' }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
            {/* User Profile Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div 
                onClick={() => {
                  if (user?.avatar) {
                    openLightbox(user.avatar, user?.name || 'Profile Photo', 'Your D.WORLD Profile');
                  } else {
                    avatarInputRef.current?.click();
                  }
                }}
                style={{ 
                  width: '58px', 
                  height: '58px', 
                  borderRadius: '16px', 
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 8px 22px rgba(79, 70, 229, 0.28)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '2.5px solid #ffffff',
                  outline: '2px solid rgba(79, 70, 229, 0.25)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  fontWeight: 800,
                  fontSize: '1.3rem',
                  color: '#fff',
                  fontFamily: 'Outfit, sans-serif'
                }}
                title={user?.avatar ? 'View profile photo' : 'Click to upload profile photo'}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {user?.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user?.name || 'Profile'} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  (user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()) || 'U'
                )}
              </div>
              {/* Camera overlay hint when no avatar */}
              {!user?.avatar && (
                <div
                  onClick={() => avatarInputRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: -4, right: -4,
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'var(--primary)', border: '2px solid #fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                  }}
                  title="Upload profile photo"
                >
                  <Camera size={10} color="#fff" />
                </div>
              )}
              {avatarUploading && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '16px',
                  background: 'rgba(0,0,0,0.5)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                </div>
              )}
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

      {/* BENTO STATS ROW — shimmer while appointments load */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }
        .stat-shimmer {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.03) 0%,
            rgba(255,255,255,0.10) 40%,
            rgba(255,255,255,0.03) 80%
          );
          background-size: 1200px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
          border-radius: 8px;
          display: inline-block;
        }
      `}</style>
      <div className="bento-grid">
        <div className="bento-card bento-span-3" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>CONFIRMED</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarCheck size={18} />
            </div>
          </div>
          {apptLoading ? <div className="stat-shimmer" style={{ height: '2.2rem', width: '3rem' }} /> : <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--primary)', fontFamily: 'Outfit' }}>{approvedCount}</h2>}
        </div>

        <div className="bento-card bento-span-3" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>PENDING</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} />
            </div>
          </div>
          {apptLoading ? <div className="stat-shimmer" style={{ height: '2.2rem', width: '3rem' }} /> : <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--warning)', fontFamily: 'Outfit' }}>{pendingCount}</h2>}
        </div>

        <div className="bento-card bento-span-3" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>COMPLETED</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={18} />
            </div>
          </div>
          {apptLoading ? <div className="stat-shimmer" style={{ height: '2.2rem', width: '3rem' }} /> : <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--success)', fontFamily: 'Outfit' }}>{completedCount}</h2>}
        </div>

        <div className="bento-card bento-span-3" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL BOOKINGS</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          {apptLoading ? <div className="stat-shimmer" style={{ height: '2.2rem', width: '3rem' }} /> : <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-main)', fontFamily: 'Outfit' }}>{totalCount}</h2>}
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
              {apptLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ padding: '1.1rem 1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div className="stat-shimmer" style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div className="stat-shimmer" style={{ height: '0.9rem', width: '55%', borderRadius: 4 }} />
                        <div className="stat-shimmer" style={{ height: '0.75rem', width: '35%', borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
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
                        {(app.status === 'pending' || app.status === 'approved') && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openRescheduleModal(app);
                            }}
                            style={{
                              background: 'rgba(245, 158, 11, 0.1)',
                              border: '1px solid rgba(245, 158, 11, 0.25)',
                              color: '#d97706',
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
                            title="Reschedule Booking"
                          >
                            <RotateCcw size={12} /> Reschedule
                          </button>
                        )}
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

          {/* BENTO SPAN 5: VERIFIED CAMPUS SPECIALISTS & EXPERTS */}
          <div className="bento-card bento-span-5">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <ShieldCheck size={18} color="var(--primary)" /> Verified Specialists
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Certified campus experts who paid the ₦3,000 activation fee
                </span>
              </div>
              <span style={{
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.25rem 0.6rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}>
                <CheckCircle2 size={12} /> {experts.length} Verified
              </span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {experts.length === 0 ? (
                <div style={{ padding: '2.5rem 1.25rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <UserCheck size={36} style={{ opacity: 0.35, marginBottom: '0.65rem' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>No verified specialists yet</p>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem' }}>Registered specialists appear here once verified and activated.</p>
                </div>
              ) : (
                experts.map(expert => {
                  const expertId = String(expert._id || expert.id);
                  const firstService = (expert.services && expert.services[0]) || null;
                  const price = firstService?.price || 3500;
                  const duration = firstService?.duration || 45;

                  return (
                    <div 
                      key={expertId}
                      style={{
                        padding: '0.9rem 1.15rem',
                        borderRadius: '16px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-light)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.85rem',
                        transition: 'all 0.2s ease',
                        pointerEvents: 'auto'
                      }}
                      className="hover-card-select"
                    >
                      <div 
                        onClick={() => navigate(`/expert/${expertId}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, cursor: 'pointer' }}
                        title={`View ${expert.name}'s Professional Page & Works`}
                      >
                        {/* Expert Avatar with click to professional page */}
                        <div 
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: '13px',
                            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2), rgba(168, 85, 247, 0.2))',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '1rem',
                            flexShrink: 0,
                            overflow: 'hidden',
                            border: '1.5px solid rgba(79, 70, 229, 0.3)',
                            position: 'relative'
                          }}
                        >
                          {expert.avatar ? (
                            <img 
                              src={expert.avatar} 
                              alt={expert.name} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          ) : (
                            expert.name ? expert.name.charAt(0).toUpperCase() : 'E'
                          )}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.92rem', fontFamily: 'Outfit', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-main)' }}>
                              {expert.name}
                            </h4>
                            <ShieldCheck size={14} color="#10b981" title="Verified & ₦3,000 Activation Paid" />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                              {expert.specialty || 'Stylist'}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>•</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              From ₦{price.toLocaleString()} ({duration}m)
                            </span>
                          </div>
                          {(expert.address || expert.location) && (
                            <span style={{ fontSize: '0.68rem', color: '#059669', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px', fontWeight: 600 }}>
                              📍 {expert.address || expert.location}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/book?expertId=${expertId}`)}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                          color: '#fff',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          flexShrink: 0,
                          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
                        }}
                      >
                        Book <ArrowRight size={13} />
                      </button>
                    </div>
                  );
                })
              )}
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
              <div>
                <h3 style={{ margin: 0 }}>Profile Settings</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Manage your campus account details & avatar</span>
              </div>
            </div>
          </div>

          <div className="card-body">
            {/* AVATAR PROFILE PICTURE UPLOADER */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              padding: '1.25rem',
              borderRadius: '18px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-light)',
              marginBottom: '1.75rem'
            }}>
              {/* Circular Avatar with Hover & Lightbox Click */}
              <div style={{ position: 'relative' }}>
                <div 
                  onClick={() => {
                    if (user?.avatar) {
                      openLightbox(user.avatar, user.name || 'My Profile Picture', `${user.email} • Full View`);
                    } else if (avatarInputRef.current) {
                      avatarInputRef.current.click();
                    }
                  }}
                  style={{
                    width: '92px',
                    height: '92px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '2rem',
                    fontWeight: 800,
                    overflow: 'hidden',
                    cursor: user?.avatar ? 'zoom-in' : 'pointer',
                    boxShadow: '0 8px 24px rgba(79, 70, 229, 0.25)',
                    border: '3px solid rgba(255, 255, 255, 0.1)',
                    position: 'relative'
                  }}
                  title={user?.avatar ? "Click to view full photo in lightbox" : "Click to upload profile picture"}
                >
                  {user?.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    user?.name ? user.name.charAt(0).toUpperCase() : 'U'
                  )}
                </div>

                {/* Camera Overlay Icon */}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current && avatarInputRef.current.click()}
                  disabled={avatarUploading}
                  title="Upload / Change Profile Picture"
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: '#fff',
                    border: '2px solid #fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                  }}
                >
                  <Camera size={15} />
                </button>
              </div>

              {/* Upload Controls & Lightbox Button */}
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontFamily: 'Outfit', fontWeight: 700 }}>
                  Profile Picture
                </h4>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  PNG, JPG, or WEBP up to 10MB. Uploads are stored securely via Cloudinary.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <input 
                    type="file" 
                    ref={avatarInputRef}
                    onChange={handleAvatarFileSelect}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />

                  <button
                    type="button"
                    onClick={() => avatarInputRef.current && avatarInputRef.current.click()}
                    disabled={avatarUploading}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                  >
                    {avatarUploading ? 'Uploading...' : 'Upload Photo'}
                  </button>

                  {user?.avatar && (
                    <button
                      type="button"
                      onClick={() => openLightbox(user.avatar, user.name || 'My Profile Picture', `${user.email} • Full View`)}
                      className="btn btn-outline"
                      style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <ZoomIn size={14} /> Full View
                    </button>
                  )}
                </div>
              </div>
            </div>

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
                  placeholder="+234 000 000 0000" 
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

                {(selectedAppointment.status === 'pending' || selectedAppointment.status === 'approved') && (
                  <button 
                    type="button"
                    onClick={() => openRescheduleModal(selectedAppointment)}
                    className="btn btn-secondary"
                    style={{ color: '#d97706', borderColor: 'rgba(245, 158, 11, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <RotateCcw size={15} /> Reschedule Date/Time
                  </button>
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

      {/* RESCHEDULE APPOINTMENT MODAL */}
      <AnimatePresence>
        {rescheduleData.isOpen && rescheduleData.appointment && (
          <div className="modal-overlay" onClick={() => !rescheduleData.submitting && setRescheduleData(prev => ({ ...prev, isOpen: false }))}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-card"
              style={{ maxWidth: '480px', width: '100%', padding: '1.75rem', borderRadius: '24px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '12px', background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RotateCcw size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'Outfit', fontWeight: 800 }}>Reschedule Appointment</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {rescheduleData.appointment.service_id?.name || 'Styling Session'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !rescheduleData.submitting && setRescheduleData(prev => ({ ...prev, isOpen: false }))}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--border-light)', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <strong>Current:</strong> {rescheduleData.appointment.date} at {rescheduleData.appointment.time}
              </div>

              <form onSubmit={handleConfirmReschedule} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block' }}>New Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={rescheduleData.date}
                    onChange={(e) => setRescheduleData(prev => ({ ...prev, date: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-light)', fontSize: '0.9rem' }}
                  />
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block' }}>New Time Slot</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', padding: '0.2rem' }}>
                    {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setRescheduleData(prev => ({ ...prev, time: slot }))}
                        style={{
                          padding: '0.55rem',
                          borderRadius: '10px',
                          border: '1.5px solid',
                          borderColor: rescheduleData.time === slot ? 'var(--primary)' : 'var(--border-light)',
                          background: rescheduleData.time === slot ? 'rgba(79, 70, 229, 0.1)' : '#ffffff',
                          color: rescheduleData.time === slot ? 'var(--primary)' : 'var(--text-main)',
                          fontWeight: rescheduleData.time === slot ? 800 : 600,
                          fontSize: '0.825rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    disabled={rescheduleData.submitting}
                    onClick={() => setRescheduleData(prev => ({ ...prev, isOpen: false }))}
                    className="btn btn-secondary"
                    style={{ padding: '0.7rem 1.25rem', borderRadius: '12px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rescheduleData.submitting}
                    className="btn btn-primary"
                    style={{ padding: '0.7rem 1.4rem', borderRadius: '12px', fontWeight: 700 }}
                  >
                    {rescheduleData.submitting ? 'Updating...' : 'Confirm Reschedule'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GLOBAL CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* SMOOTH IMAGE LIGHTBOX MODAL */}
      <ImageLightboxModal
        isOpen={lightbox.isOpen}
        imageUrl={lightbox.imageUrl}
        title={lightbox.title}
        subtitle={lightbox.subtitle}
        onClose={() => setLightbox(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
};

export default Dashboard;
