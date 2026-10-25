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
  AlertCircle,
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  Power,
  Banknote,
  Check,
  ArrowDownToLine,
  Loader
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../components/ConfirmModal';

import { API_URL } from '../config/api';

const Admin = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'appointments';
  
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // User Management State
  const [users, setUsers] = useState([]);
  const [userSummary, setUserSummary] = useState({ totalUsers: 0, totalExperts: 0, activeExperts: 0, totalStudents: 0 });
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');

  // Payout Requests State
  const [payouts, setPayouts] = useState([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('all');
  const [payoutSummary, setPayoutSummary] = useState({ totalPending: 0, totalCompleted: 0 });
  const [processingPayoutId, setProcessingPayoutId] = useState(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger',
    loading: false,
    onConfirm: null
  });
  
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

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await axios.get(`${API_URL}/auth/admin/users`, {
        params: {
          search: userSearchQuery,
          role: userRoleFilter,
          status: userStatusFilter
        }
      });
      if (res.data.success) {
        setUsers(res.data.data);
        if (res.data.summary) setUserSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Error fetching admin users', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchPayouts = async () => {
    setPayoutsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/payouts/admin/all`, {
        params: { status: payoutStatusFilter }
      });
      if (res.data.success) {
        setPayouts(res.data.data || []);
        if (res.data.summary) setPayoutSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Error fetching admin payouts', err);
    } finally {
      setPayoutsLoading(false);
    }
  };

  const handleUpdatePayoutStatus = (payoutId, newStatus) => {
    if (processingPayoutId) return;
    const isReject = newStatus === 'rejected';
    setConfirmModal({
      isOpen: true,
      title: isReject ? 'Reject Payout Request?' : 'Mark Payout as Completed?',
      message: isReject 
        ? `Are you sure you want to reject this withdrawal? The funds will be automatically refunded back to the specialist's wallet balance.`
        : `Are you sure you want to mark this payout as completed? Confirm that you have transferred the funds to the specialist's bank account.`,
      confirmText: isReject ? 'Reject & Refund' : 'Confirm Paid',
      type: isReject ? 'danger' : 'primary',
      loading: false,
      onConfirm: async () => {
        if (processingPayoutId) return;
        try {
          setProcessingPayoutId(payoutId);
          setConfirmModal(prev => ({ ...prev, loading: true }));
          const res = await axios.patch(`${API_URL}/payouts/admin/${payoutId}/status`, {
            status: newStatus
          });
          if (res.data.success) {
            notify.success(res.data.message || `Payout marked as ${newStatus}`);
            fetchPayouts();
          }
        } catch (err) {
          notify.error(err.response?.data?.message || 'Failed to update payout status');
        } finally {
          setProcessingPayoutId(null);
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        }
      }
    });
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'payouts') {
      fetchPayouts();
    }
  }, [activeTab, userRoleFilter, userStatusFilter, payoutStatusFilter]);

  const handleToggleUserActivation = async (targetUser) => {
    try {
      const newStatus = !targetUser.isActivated;
      const res = await axios.patch(`${API_URL}/auth/admin/users/${targetUser._id}/status`, {
        isActivated: newStatus
      });
      if (res.data.success) {
        addToast(`Expert ${targetUser.name} ${newStatus ? 'activated' : 'deactivated'} successfully!`, 'success');
        fetchUsers();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update user status.', 'error');
    }
  };

  const handleDeleteUser = (targetUser) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete ${targetUser.name}'s Account?`,
      message: `Permanently delete ${targetUser.email}? This will erase their user profile and associated data.`,
      confirmText: 'Delete Account',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await axios.delete(`${API_URL}/auth/admin/users/${targetUser._id}`);
          if (res.data.success) {
            addToast(res.data.message || 'User deleted successfully.', 'info');
            fetchUsers();
          }
        } catch (err) {
          addToast(err.response?.data?.message || 'Failed to delete user.', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
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

  const handleDeleteService = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Service Card?',
      message: 'Are you sure you want to remove this service from the platform catalog? This cannot be undone.',
      confirmText: 'Delete Service',
      type: 'danger',
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/services/${id}`);
          addToast('Service removed from catalog.', 'info');
          fetchData();
        } catch (err) {
          addToast('Failed to delete service.', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
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

            {/* USER DIRECTORY TAB */}
            {activeTab === 'users' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="app-card">
                <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Users size={20} color="var(--primary)" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>User & Expert Directory ({users.length})</h3>
                  </div>

                  <div className="admin-filter-row">
                    <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px', display: 'flex', gap: '0.5rem' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <input 
                          type="text" 
                          placeholder="Search name, email, matric, location..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') fetchUsers(); }}
                          style={{ width: '100%', padding: '0.45rem 0.85rem 0.45rem 2.2rem', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                        />
                        <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                      </div>
                      <button
                        onClick={fetchUsers}
                        className="btn btn-primary"
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', flexShrink: 0 }}
                        title="Search users"
                      >
                        <Search size={14} />
                      </button>
                    </div>

                    {/* Role Filter Chips */}
                    <div className="admin-chips">
                      {['all', 'expert', 'user', 'admin'].map(r => (
                        <button
                          key={r}
                          onClick={() => setUserRoleFilter(r)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-light)',
                            background: userRoleFilter === r ? 'var(--primary)' : 'transparent',
                            color: userRoleFilter === r ? 'white' : 'var(--text-muted)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textTransform: 'capitalize'
                          }}
                        >
                          {r === 'user' ? 'Students' : r === 'all' ? 'All Roles' : r + 's'}
                        </button>
                      ))}
                    </div>

                    {/* Status Filter Chips */}
                    <div className="admin-chips">
                      {[
                        { key: 'all', label: 'All Status' },
                        { key: 'activated', label: 'Activated' },
                        { key: 'unactivated', label: 'Unactivated' }
                      ].map(st => (
                        <button
                          key={st.key}
                          onClick={() => setUserStatusFilter(st.key)}
                          style={{
                            padding: '0.4rem 0.7rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-light)',
                            background: userStatusFilter === st.key ? '#10b981' : 'transparent',
                            color: userStatusFilter === st.key ? 'white' : 'var(--text-muted)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* User Stats KPI Row */}
                <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Total Accounts', value: userSummary.totalUsers, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: <Users size={15} /> },
                    { label: 'Total Experts', value: userSummary.totalExperts, color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', icon: <UserCheck size={15} /> },
                    { label: 'Active Experts', value: userSummary.activeExperts, color: '#059669', bg: 'rgba(16,185,129,0.1)', icon: <ShieldCheck size={15} /> },
                    { label: 'Students', value: userSummary.totalStudents, color: '#d97706', bg: 'rgba(245,158,11,0.1)', icon: <User size={15} /> },
                  ].map(stat => (
                    <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.85rem', borderRadius: '10px', background: stat.bg, border: `1px solid ${stat.color}30`, flex: '1 1 120px', minWidth: '110px' }}>
                      <span style={{ color: stat.color }}>{stat.icon}</span>
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-main)', lineHeight: 1 }}>{stat.value}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card-body" style={{ padding: 0 }}>
                  {usersLoading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading directory accounts...
                    </div>
                  ) : users.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {users.map(u => (
                        <div key={u._id} className="admin-appt-row">
                          {/* User Identity */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 240px', minWidth: 0 }}>
                            <div style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              background: u.role === 'expert' ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.2), rgba(124, 58, 237, 0.25))' : 'rgba(99, 102, 241, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid var(--border-light)',
                              color: 'var(--primary)',
                              fontWeight: 800,
                              fontFamily: 'Outfit',
                              fontSize: '1rem',
                              flexShrink: 0
                            }}>
                              {u.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                <strong style={{ color: 'var(--text-main)', fontSize: '0.925rem', fontFamily: 'Outfit' }}>
                                  {u.name}
                                </strong>
                                <span style={{
                                  fontSize: '0.68rem',
                                  padding: '0.12rem 0.45rem',
                                  borderRadius: '6px',
                                  background: u.role === 'admin' ? 'rgba(239,68,68,0.12)' : u.role === 'expert' ? 'rgba(124,58,237,0.12)' : 'rgba(99,102,241,0.08)',
                                  color: u.role === 'admin' ? '#ef4444' : u.role === 'expert' ? '#7c3aed' : 'var(--primary)',
                                  fontWeight: 700,
                                  textTransform: 'uppercase'
                                }}>
                                  {u.role === 'user' ? 'Student' : u.role}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {u.email} {u.phone ? `· ${u.phone}` : ''}
                              </span>
                            </div>
                          </div>

                          {/* Extra Metadata (Specialty, Matric, Location) */}
                          <div className="admin-appt-meta" style={{ flex: '1 1 200px' }}>
                            {u.role === 'expert' && (
                              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                {u.specialty || 'General Specialist'}
                              </span>
                            )}
                            {(u.location || u.address) && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <MapPin size={12} color="#10b981" /> {u.location || u.address}
                              </span>
                            )}
                            {u.matricNo && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                                Matric: {u.matricNo}
                              </span>
                            )}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                              Wallet: ₦{(u.walletBalance || 0).toLocaleString()}
                            </span>
                            {u.createdAt && (
                              <span style={{ fontSize: '0.73rem', color: 'var(--text-subtle)' }}>
                                Joined: {new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>

                          {/* Status & Actions */}
                          <div className="admin-appt-actions">
                            {u.role === 'expert' && (
                              <span style={{
                                fontSize: '0.75rem',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '8px',
                                fontWeight: 700,
                                background: u.isActivated ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                color: u.isActivated ? '#059669' : '#d97706',
                                border: `1px solid ${u.isActivated ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}>
                                {u.isActivated ? <UserCheck size={13} /> : <UserX size={13} />}
                                {u.isActivated ? 'Activated' : 'Unactivated'}
                              </span>
                            )}

                            {/* Role changer — only for non-admin users */}
                            {u._id !== user?.id && u.role !== 'admin' && (
                              <select
                                value={u.role}
                                onChange={async (e) => {
                                  const newRole = e.target.value;
                                  try {
                                    const res = await axios.patch(`${API_URL}/auth/admin/users/${u._id}/status`, { role: newRole });
                                    if (res.data.success) {
                                      addToast(`${u.name}'s role changed to ${newRole}.`, 'success');
                                      fetchUsers();
                                    }
                                  } catch (err) {
                                    addToast(err.response?.data?.message || 'Failed to change role.', 'error');
                                  }
                                }}
                                style={{
                                  padding: '0.35rem 0.6rem',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border-light)',
                                  background: 'rgba(255,255,255,0.04)',
                                  color: 'var(--text-main)',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                                title="Change user role"
                              >
                                <option value="user">Student</option>
                                <option value="expert">Expert</option>
                              </select>
                            )}

                            {u.role === 'expert' && (
                              <button
                                type="button"
                                onClick={() => handleToggleUserActivation(u)}
                                className="btn btn-secondary"
                                style={{
                                  padding: '0.4rem 0.75rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: u.isActivated ? '#d97706' : '#059669'
                                }}
                              >
                                <Power size={13} /> {u.isActivated ? 'Deactivate' : 'Activate'}
                              </button>
                            )}

                            {u._id !== user?.id && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                className="btn btn-outline"
                                style={{
                                  padding: '0.4rem 0.65rem',
                                  fontSize: '0.75rem',
                                  color: '#ef4444',
                                  borderColor: 'rgba(239, 68, 68, 0.25)'
                                }}
                                title="Delete User"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No user accounts found matching your filters.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* PAYOUT REQUESTS TAB */}
            {activeTab === 'payouts' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="app-card">
                <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Banknote size={20} color="#10b981" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Specialist Payout Requests ({payouts.length})</h3>
                  </div>

                  <div className="admin-chips">
                    {[
                      { key: 'all', label: 'All Payouts' },
                      { key: 'pending', label: `Pending (${payoutSummary.totalPending})` },
                      { key: 'completed', label: `Completed (${payoutSummary.totalCompleted})` },
                      { key: 'rejected', label: 'Rejected' }
                    ].map(st => (
                      <button
                        key={st.key}
                        onClick={() => setPayoutStatusFilter(st.key)}
                        style={{
                          padding: '0.4rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-light)',
                          background: payoutStatusFilter === st.key ? '#10b981' : 'transparent',
                          color: payoutStatusFilter === st.key ? '#fff' : 'var(--text-muted)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="card-body" style={{ padding: 0 }}>
                  {payoutsLoading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading specialist payout requests...
                    </div>
                  ) : payouts.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {payouts.map(p => {
                        const statusColors = {
                          pending: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
                          completed: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
                          approved: { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' },
                          rejected: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' }
                        };
                        const sStyle = statusColors[p.status] || { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' };

                        return (
                          <div key={p._id} className="admin-appt-row" style={{ flexWrap: 'wrap', gap: '1rem', padding: '1rem 1.25rem' }}>
                            {/* Specialist info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 220px', minWidth: 0 }}>
                              <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2), rgba(124, 58, 237, 0.25))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid var(--border-light)',
                                color: 'var(--primary)',
                                fontWeight: 800,
                                fontFamily: 'Outfit',
                                flexShrink: 0
                              }}>
                                {p.user_id?.name?.charAt(0)?.toUpperCase() || 'S'}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {p.user_id?.name || 'Specialist'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  {p.user_id?.phone || p.user_id?.email}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                                  Ref: {p.reference}
                                </div>
                              </div>
                            </div>

                            {/* Bank Details */}
                            <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                                Destination Account
                              </div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                {p.bankDetails?.bankName}
                              </div>
                              <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--primary)', letterSpacing: '0.04em' }}>
                                {p.bankDetails?.accountNumber}
                              </div>
                              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                {p.bankDetails?.accountName}
                              </div>
                            </div>

                            {/* Amount & Status */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: '0 0 130px' }}>
                              <span style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'Outfit', color: '#10b981' }}>
                                ₦{p.amount.toLocaleString()}
                              </span>
                              <span style={{
                                padding: '0.2rem 0.6rem',
                                borderRadius: '9999px',
                                background: sStyle.bg,
                                color: sStyle.color,
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                textTransform: 'capitalize',
                                marginTop: '0.25rem'
                              }}>
                                {p.status}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', marginTop: '0.25rem' }}>
                                {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}
                              </span>
                            </div>

                            {/* Actions for Pending */}
                            {p.status === 'pending' && (
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePayoutStatus(p._id, 'completed')}
                                  disabled={!!processingPayoutId}
                                  className="btn btn-primary"
                                  style={{
                                    padding: '0.45rem 0.85rem',
                                    fontSize: '0.78rem',
                                    background: '#10b981',
                                    borderColor: '#059669',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    opacity: processingPayoutId ? 0.6 : 1,
                                    cursor: processingPayoutId ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  {processingPayoutId === p._id ? (
                                    <Loader size={14} className="animate-spin" />
                                  ) : (
                                    <Check size={14} />
                                  )}
                                  Mark Paid
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePayoutStatus(p._id, 'rejected')}
                                  disabled={!!processingPayoutId}
                                  className="btn btn-outline"
                                  style={{
                                    padding: '0.45rem 0.85rem',
                                    fontSize: '0.78rem',
                                    color: '#ef4444',
                                    borderColor: 'rgba(239, 68, 68, 0.4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    opacity: processingPayoutId ? 0.6 : 1,
                                    cursor: processingPayoutId ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  {processingPayoutId === p._id ? (
                                    <>
                                      <Loader size={14} className="animate-spin" />
                                      <span>Rejecting...</span>
                                    </>
                                  ) : (
                                    'Reject & Refund'
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No payout requests found in this filter.
                    </div>
                  )}
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

      {/* Global Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
        loading={confirmModal.loading || !!processingPayoutId}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => {
          if (!confirmModal.loading && !processingPayoutId) {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
        }}
      />

    </div>
  );
};

export default Admin;
