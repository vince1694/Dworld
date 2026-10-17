import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
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
  ShieldAlert, 
  Briefcase, 
  DollarSign, 
  Activity,
  Globe,
  Plus,
  X,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


import { API_URL } from '../config/api';

const Admin = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'appointments';
  
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Service Modal & Form State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', duration: '45', price: '', location: 'Main Studio' });
  const [editingServiceId, setEditingServiceId] = useState(null);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appRes, srvRes, msgRes] = await Promise.all([
        axios.get(`${API_URL}/appointments/all`),
        axios.get(`${API_URL}/services`),
        axios.get(`${API_URL}/contact`)
      ]);
      if (appRes.data.success) setAppointments(appRes.data.data);
      if (srvRes.data.success) setServices(srvRes.data.data);
      if (msgRes.data.success) setMessages(msgRes.data.data);
    } catch (err) {
      console.error('Error fetching admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await axios.patch(`${API_URL}/appointments/${id}/status`, { status });
      if (res.data.success) {
        addToast(`Appointment updated to ${status}`, 'success');
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
        addToast('Platform service updated successfully!', 'success');
      } else {
        await axios.post(`${API_URL}/services`, serviceForm);
        addToast('Platform service created successfully!', 'success');
      }
      setIsServiceModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save service.', 'error');
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service card?')) return;
    try {
      await axios.delete(`${API_URL}/services/${id}`);
      addToast('Service removed from catalog.', 'info');
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
        addToast('Admin settings saved successfully!', 'success');
      }
    } catch (err) {
      addToast('Failed to update profile settings.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // KPIs
  const pendingApps = appointments.filter(a => a.status === 'pending').length;
  const approvedApps = appointments.filter(a => a.status === 'approved').length;
  const totalVolume = appointments.reduce((sum, a) => sum + (a.service_id?.price || 0), 0);
  const platformCommissions = appointments
    .filter(a => a.paymentStatus === 'paid')
    .reduce((sum, a) => sum + (a.commissionAmount || Math.round((a.service_id?.price || 0) * 0.10)), 0);

  // Filtered Appointments List
  const filteredAppointments = appointments.filter(app => {
    const matchStatus = statusFilter === 'all' ? true : app.status === statusFilter;
    const clientName = app.user_id?.name || app.client_name || '';
    const serviceName = app.service_id?.name || '';
    const matchSearch = clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.date.includes(searchQuery);
    return matchStatus && matchSearch;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      


      <style>{`
        .admin-kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.85rem; }
        .admin-appt-row { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-light); flex-wrap: wrap; gap: 0.75rem; }
        .admin-appt-meta { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.8rem; color: var(--text-muted); }
        .admin-appt-actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .admin-chips { display: flex; gap: 0.4rem; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; padding-bottom: 2px; flex-shrink: 0; }
        .admin-chips::-webkit-scrollbar { display: none; }
        .admin-filter-row { display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap; width: 100%; }
        @media (max-width: 900px) { .admin-kpi-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 600px) {
          .admin-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .admin-kpi-card { padding: 0.9rem !important; }
          .admin-appt-row { padding: 0.85rem 1rem; }
          .admin-appt-actions { width: 100%; justify-content: flex-end; }
          .admin-appt-meta { min-width: 0; }
          .admin-filter-row { flex-direction: column; align-items: stretch !important; }
          .admin-chips { width: 100%; }
        }
      `}</style>

      {/* Header Banner */}
      <div 
        className="app-card hero-banner-compact" 
        style={{ 
          padding: '1.5rem', 
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(99, 102, 241, 0.15))',
          borderColor: 'rgba(239, 68, 68, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h1 style={{ fontSize: 'clamp(1.2rem, 3.2vw, 1.85rem)', marginBottom: '0.25rem', fontFamily: 'Outfit' }}>
            Admin System Operations Console
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            Full system governance, appointment status overrides, and platform service definitions.
          </p>
        </div>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
             <ShieldAlert size={15} /> SYSTEM ADMIN
          </span>
        </div>
      </div>

      <div className="admin-kpi-grid">
        <div className="app-card admin-kpi-card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.55rem', background: 'rgba(239,68,68,0.1)', borderRadius: '10px', color: '#ef4444', flexShrink: 0 }}><Globe size={20} /></div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>BOOKINGS</span>
            <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>{appointments.length}</strong>
          </div>
        </div>
        <div className="app-card admin-kpi-card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.55rem', background: 'rgba(245,158,11,0.1)', borderRadius: '10px', color: '#d97706', flexShrink: 0 }}><Clock size={20} /></div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PENDING</span>
            <strong style={{ fontSize: '1.2rem', color: '#d97706', fontFamily: 'Outfit' }}>{pendingApps}</strong>
          </div>
        </div>
        <div className="app-card admin-kpi-card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.55rem', background: 'rgba(16,185,129,0.1)', borderRadius: '10px', color: '#059669', flexShrink: 0 }}><DollarSign size={20} /></div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>VOLUME</span>
            <strong style={{ fontSize: '1.1rem', color: '#059669', fontFamily: 'Outfit' }}>₦{totalVolume.toLocaleString()}</strong>
          </div>
        </div>
        <div className="app-card admin-kpi-card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.55rem', background: 'rgba(139,92,246,0.1)', borderRadius: '10px', color: '#a78bfa', flexShrink: 0 }}><Activity size={20} /></div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>10% CUT</span>
            <strong style={{ fontSize: '1.1rem', color: '#a78bfa', fontFamily: 'Outfit' }}>₦{platformCommissions.toLocaleString()}</strong>
          </div>
        </div>
        <div className="app-card admin-kpi-card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.55rem', background: 'rgba(99,102,241,0.1)', borderRadius: '10px', color: 'var(--primary)', flexShrink: 0 }}><Briefcase size={20} /></div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SERVICES</span>
            <strong style={{ fontSize: '1.2rem', color: 'var(--primary)', fontFamily: 'Outfit' }}>{services.length}</strong>
          </div>
        </div>
      </div>

      <div style={{ minHeight: '500px' }}>
        {loading ? (
          <div className="flex-center" style={{ minHeight: '300px', color: 'var(--text-muted)' }}>
            Loading platform logs...
          </div>
        ) : (
          <>
            {/* APPOINTMENTS OVERVIEW TAB */}
            {activeTab === 'appointments' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="app-card">
                <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CalendarRange size={20} color="var(--primary)" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Global Appointment Master Log</h3>
                  </div>

                  <div className="admin-filter-row">
                    <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '140px' }}>
                      <input 
                        type="text" 
                        placeholder="Filter client, service, date..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '0.45rem 0.85rem 0.45rem 2.2rem', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                      />
                      <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                    </div>
                    <div className="admin-chips">
                      {['all','pending','approved','completed','cancelled'].map(st => (
                        <button key={st} onClick={() => setStatusFilter(st)} style={{ padding: '0.4rem 0.7rem', borderRadius: '8px', border: '1px solid var(--border-light)', background: statusFilter === st ? 'var(--primary)' : 'transparent', color: statusFilter === st ? 'white' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card-body" style={{ padding: 0 }}>
                  {filteredAppointments.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {filteredAppointments.map((app) => (
                        <div key={app.id || app._id} className="admin-appt-row">
                          {/* Client info */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 200px', minWidth: 0 }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--primary)', flexShrink: 0 }}>
                              <User size={18} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem', display: 'block', fontFamily: 'Outfit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {app.user_id?.name || app.client_name || 'Client'}
                              </span>
                              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                                {app.service_id?.name || 'Standard'}
                              </span>
                            </div>
                          </div>

                          {/* Date + fee */}
                          <div className="admin-appt-meta">
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Clock size={13} color="var(--primary)" /> {app.date} · {app.time}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                              ₦{(app.service_id?.price || 0).toLocaleString()}
                              {app.paymentStatus === 'paid' && <span style={{ fontSize: '0.68rem', padding: '0.12rem 0.4rem', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 700 }}>PAID · 10%: ₦{(app.commissionAmount || Math.round((app.service_id?.price || 0) * 0.1)).toLocaleString()}</span>}
                              {app.paymentStatus === 'refunded' && <span style={{ fontSize: '0.68rem', padding: '0.12rem 0.4rem', borderRadius: '6px', background: 'rgba(239,68,68,0.12)', color: '#f87171', fontWeight: 700 }}>REFUNDED</span>}
                              {(!app.paymentStatus || app.paymentStatus === 'unpaid') && <span style={{ fontSize: '0.68rem', padding: '0.12rem 0.4rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', fontWeight: 700 }}>UNPAID</span>}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="admin-appt-actions">
                            <span className={`status-badge status-${app.status}`}>{app.status}</span>
                            {app.status !== 'approved' && (
                              <button onClick={() => handleUpdateStatus(app.id || app._id, 'approved')} className="btn btn-secondary" style={{ padding: '0.4rem 0.65rem', fontSize: '0.75rem', color: 'var(--success)', whiteSpace: 'nowrap' }}>
                                <CheckCircle size={13} /> Approve
                              </button>
                            )}
                            {app.status !== 'cancelled' && (
                              <button onClick={() => handleUpdateStatus(app.id || app._id, 'cancelled')} className="btn btn-secondary" style={{ padding: '0.4rem 0.65rem', fontSize: '0.75rem', color: '#ef4444', whiteSpace: 'nowrap' }}>
                                <XCircle size={13} /> Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No appointment records found.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* SERVICES MANAGEMENT TAB */}
            {activeTab === 'services' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="app-card">
                <div className="card-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <PackagePlus size={20} color="var(--secondary)" />
                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Catalog Service Management</h3>
                  </div>

                  <button 
                    onClick={openNewServiceModal}
                    className="btn btn-primary" 
                    style={{ padding: '0.65rem 1.25rem', fontSize: '0.875rem' }}
                  >
                    <Plus size={16} /> Create Service Card
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
                            {service.description || 'Standard appointment service.'}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Clock size={14} /> {service.duration || 45} mins
                            </span>
                            <span>•</span>
                            <span>{service.location || 'Studio'}</span>
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

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="app-card" style={{ maxWidth: '600px' }}>
                <div className="card-header">
                  <h3 style={{ margin: 0 }}>Admin Profile Settings</h3>
                </div>
                <div className="card-body">
                  <form onSubmit={submitProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label>Administrator Name</label>
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
                      {savingProfile ? 'Saving...' : 'Save Configuration'}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* CONTACT MESSAGES INBOX TAB */}
            {(activeTab === 'inquiries' || activeTab === 'messages' || activeTab === 'profile') && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="app-card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Mail size={20} color="var(--primary)" />
                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Contact Form Inquiries Inbox ({messages.length})</h3>
                  </div>
                </div>
                <div className="card-body">
                  {messages.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {messages.map((msg, idx) => (
                        <div key={msg._id || idx} style={{
                          padding: '1rem 1.25rem',
                          borderRadius: '12px',
                          background: '#f8fafc',
                          border: '1px solid var(--border-light)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{msg.name}</strong>
                            <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{new Date(msg.createdAt).toLocaleString()}</span>
                          </div>
                          <span style={{ fontSize: '0.825rem', color: 'var(--primary)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                            {msg.email}
                          </span>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            "{msg.message}"
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.875rem' }}>
                      No contact inquiries received yet.
                    </div>
                  )}
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
              style={{ maxWidth: '520px', width: '100%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'Outfit' }}>
                  {editingServiceId ? 'Edit Platform Service' : 'Create Platform Service'}
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

    </div>
  );
};

export default Admin;
