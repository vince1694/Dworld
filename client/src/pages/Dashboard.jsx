import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
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
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BookingWizardModal from '../components/BookingWizardModal';
import ReviewModal from '../components/ReviewModal';
import ToastContainer from '../components/ToastContainer';

import { API_URL } from '../config/api';

const Dashboard = () => {
  const { user } = useAuth();
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

  // Toast System
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

  useEffect(() => {
    fetchData();
    const bookParam = searchParams.get('book');
    if (bookParam) {
      setPreselectedServiceId(bookParam);
      setIsWizardOpen(true);
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
    setPreselectedServiceId(serviceId);
    setIsWizardOpen(true);
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

  const handlePayAppointment = async (appointmentId) => {
    try {
      const res = await axios.post(`${API_URL}/appointments/${appointmentId}/pay`);
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setSelectedAppointment(null);
        fetchData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Payment failed. Please check your wallet balance.', 'error');
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    if (!window.confirm('Delete this appointment from your history?')) return;
    try {
      const res = await axios.delete(`${API_URL}/appointments/${appointmentId}`);
      if (res.data.success) {
        addToast('Appointment deleted from history.', 'info');
        setSelectedAppointment(null);
        fetchData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete appointment record.', 'error');
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
      
      {/* Toast Alert System */}
      <ToastContainer toasts={toasts} removeToast={(id) => setToasts(t => t.filter(x => x.id !== id))} />

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
      <div className="bento-card" style={{ padding: '2.25rem', background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(124, 58, 237, 0.08), rgba(2, 132, 199, 0.06))', borderColor: 'rgba(79, 70, 229, 0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '16px', 
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 6px 20px rgba(79, 70, 229, 0.25)'
            }}>
              <Sparkles size={30} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.2rem' }}>
                <h1 style={{ fontSize: '1.85rem', margin: 0, fontFamily: 'Outfit' }}>
                  {getGreeting()}, {user?.name || 'User'}
                </h1>
                {nextUpcoming && (
                  <span style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', padding: '0.25rem 0.7rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={12} /> Next: {nextUpcoming.date}
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', margin: 0 }}>
                Welcome to your D.WORLD workspace. Manage your appointments and schedules in real-time.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => { setPreselectedServiceId(null); setIsWizardOpen(true); }}
              className="btn btn-primary"
              style={{ padding: '0.85rem 1.75rem', fontSize: '0.95rem' }}
            >
              <CalendarPlus size={18} /> Book Appointment
            </button>
          </div>
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
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
                      textTransform: 'capitalize'
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
                      marginLeft: '0.25rem'
                    }}
                  >
                    <Trash2 size={12} /> Clear History
                  </button>
                )}
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
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '1.25rem 1.5rem',
                        borderBottom: '1px solid var(--border-light)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      className="hover-card-select"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: 'rgba(99, 102, 241, 0.1)',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--primary)'
                        }}>
                          <CalendarCheck size={20} />
                        </div>
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.975rem', display: 'block', fontFamily: 'Outfit' }}>
                            {app.service_id?.name || 'Appointment'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Clock size={13} color="var(--primary)" /> {app.date} at {app.time}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <User size={13} color="var(--secondary)" /> {app.service_id?.duration || 45} mins
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className={`status-badge status-${app.status}`}>
                          {app.status}
                        </span>
                        <Eye size={16} color="var(--text-subtle)" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '4rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <CalendarX2 size={48} style={{ color: 'var(--border-strong)' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No appointments match your filter.</p>
                  <button 
                    onClick={() => { setPreselectedServiceId(null); setIsWizardOpen(true); }}
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
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {selectedAppointment.status === 'completed' && selectedAppointment.paymentStatus !== 'paid' && (
                  <button 
                    onClick={() => handlePayAppointment(selectedAppointment.id || selectedAppointment._id)}
                    className="btn btn-primary"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: 800 }}
                  >
                    Pay Expert (₦{(selectedAppointment.service_id?.price || 0).toLocaleString()})
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
                    style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  >
                    Cancel Booking
                  </button>
                )}

                {selectedAppointment.status === 'approved' && selectedAppointment.paymentStatus !== 'paid' && (
                  <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '0.4rem 0.85rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem' }}>
                    Confirmed by expert — cannot be cancelled
                  </span>
                )}
                {(selectedAppointment.status === 'completed' || selectedAppointment.status === 'cancelled') && (
                  <button 
                    onClick={() => handleDeleteAppointment(selectedAppointment.id || selectedAppointment._id)}
                    className="btn btn-outline"
                    style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  >
                    <Trash2 size={15} /> Delete Record
                  </button>
                )}

                <button onClick={() => setSelectedAppointment(null)} className="btn btn-secondary">
                  Close Window
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Dashboard;
