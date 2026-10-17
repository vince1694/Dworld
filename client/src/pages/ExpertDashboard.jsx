import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  CalendarRange,
  PackagePlus,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  User,
  Clock,
  Briefcase,
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
  Moon,
  LogOut,
  Menu,
  Bell,
  ChevronRight,
  Star,
  Shield,
  BarChart2,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import AppointmentChatModal from '../components/AppointmentChatModal';
import ExpertActivationModal from '../components/ExpertActivationModal';
import WalletModal from '../components/WalletModal';
import { getGoogleCalendarUrl, downloadIcsFile } from '../utils/calendar';
import { API_URL } from '../config/api';

/* ─── helpers ─── */
const statusColor = (s) => {
  const m = { pending: '#f59e0b', approved: '#10b981', completed: '#6366f1', cancelled: '#ef4444' };
  return m[s] || '#94a3b8';
};
const statusBg = (s) => {
  const m = { pending: 'rgba(245,158,11,0.12)', approved: 'rgba(16,185,129,0.12)', completed: 'rgba(99,102,241,0.12)', cancelled: 'rgba(239,68,68,0.1)' };
  return m[s] || 'rgba(148,163,184,0.1)';
};

const NAV_ITEMS = [
  { key: 'appointments', label: 'Schedule', icon: CalendarRange },
  { key: 'services',     label: 'Services',  icon: Briefcase },
  { key: 'availability', label: 'Hours',     icon: Clock },
  { key: 'wallet',       label: 'Wallet',    icon: Wallet },
  { key: 'profile',      label: 'Profile',   icon: User },
];

const ExpertDashboard = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationDismissed, setActivationDismissed] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'appointments';

  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Service Modal State (Edit Only)
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', duration: '45', price: '', location: 'Main Studio', category: 'Hair Packages' });
  const [editingServiceId, setEditingServiceId] = useState(null);

  const { notify } = useNotify();
  const addToast = (message, type = 'success') => {
    if (type === 'error') notify.error(message);
    else if (type === 'info') notify.info(message);
    else if (type === 'warning') notify.warning(message);
    else notify.success(message);
  };

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [workingDays, setWorkingDays] = useState(
    user?.workingDays?.length > 0 ? user.workingDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  );
  const [workingHours, setWorkingHours] = useState({ start: user?.workingHours?.start || '09:00', end: user?.workingHours?.end || '18:00' });
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [chatAppointment, setChatAppointment] = useState(null);

  useEffect(() => { fetchData(); fetchWallet(); }, []);

  const fetchWallet = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/wallet`);
      if (res.data.success) {
        setWalletBalance(res.data.data.walletBalance);
        setWalletTransactions(res.data.data.transactions || []);
      }
    } catch (err) { console.error('Error fetching expert wallet', err); }
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
      const userRes = await axios.get(`${API_URL}/auth/me`);
      if (userRes.data.success && userRes.data.user) {
        if (userRes.data.user.workingDays) setWorkingDays(userRes.data.user.workingDays);
        if (userRes.data.user.workingHours) setWorkingHours(userRes.data.user.workingHours);
      }
    } catch (err) { console.error('Error fetching expert data', err); }
    finally { setLoading(false); }
  };

  const handleLogout = () => { logout(); navigate('/login'); };
  const toggleDay = (day) => {
    if (workingDays.includes(day)) {
      if (workingDays.length === 1) { addToast('Must keep at least one working day.', 'error'); return; }
      setWorkingDays(workingDays.filter(d => d !== day));
    } else { setWorkingDays([...workingDays, day]); }
  };

  const handleSaveAvailability = async (e) => {
    e.preventDefault(); setSavingAvailability(true);
    try {
      const res = await axios.put(`${API_URL}/auth/availability`, { workingDays, workingHours });
      if (res.data.success) addToast('Availability updated!', 'success');
    } catch (err) { addToast(err.response?.data?.message || 'Failed to update', 'error'); }
    finally { setSavingAvailability(false); }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await axios.patch(`${API_URL}/appointments/${id}/status`, { status });
      if (res.data.success) { addToast(`Appointment ${status}`, 'success'); fetchData(); }
    } catch (err) { addToast('Failed to update appointment status.', 'error'); }
  };

  const handleEditService = (s) => {
    setServiceForm({ name: s.name, description: s.description || '', duration: s.duration, price: s.price, location: s.location || '', category: s.category || 'Hair Packages' });
    setEditingServiceId(s.id || s._id);
    setIsServiceModalOpen(true);
  };
  const submitService = async (e) => {
    e.preventDefault();
    if (!editingServiceId) return;
    try {
      await axios.put(`${API_URL}/services/${editingServiceId}`, serviceForm);
      addToast('Specialty service details updated!', 'success');
      setIsServiceModalOpen(false);
      fetchData();
    } catch (err) { addToast(err.response?.data?.message || 'Failed to save.', 'error'); }
  };
  const handleDeleteService = async (id) => {
    if (!window.confirm('Delete this service?')) return;
    try { await axios.delete(`${API_URL}/services/${id}`); addToast('Service removed.', 'info'); fetchData(); }
    catch (err) { addToast('Failed to delete.', 'error'); }
  };
  const submitProfile = async (e) => {
    e.preventDefault(); setSavingProfile(true);
    try {
      const res = await axios.put(`${API_URL}/auth/profile`, profileForm);
      if (res.data.success) addToast('Profile saved!', 'success');
    } catch (err) { addToast('Failed to update profile.', 'error'); }
    finally { setSavingProfile(false); }
  };

  const pendingApps   = appointments.filter(a => a.status === 'pending').length;
  const approvedApps  = appointments.filter(a => a.status === 'approved').length;
  const completedApps = appointments.filter(a => a.status === 'completed').length;
  const paidEarnings  = appointments
    .filter(a => a.paymentStatus === 'paid')
    .reduce((sum, a) => sum + (a.expertPayout || Math.round((parseFloat(a.service_id?.price) || 0) * 0.90)), 0);

  const initials = (user?.name || 'E').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  /* ─── Sidebar Item ─── */
  const SideNav = ({ mobile = false }) => (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: mobile ? '0' : '0.5rem 0' }}>
      {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
        const active = activeTab === key;
        return (
          <button
            key={key}
            onClick={() => { setSearchParams({ tab: key }); if (mobile) setSidebarOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: active ? 'linear-gradient(135deg, rgba(168,85,247,0.18), rgba(99,102,241,0.18))' : 'transparent',
              color: active ? 'var(--secondary)' : 'var(--text-muted)',
              fontWeight: active ? 700 : 500, fontSize: '0.9rem',
              textAlign: 'left', width: '100%', transition: 'all 0.18s ease',
              borderLeft: active ? '3px solid var(--secondary)' : '3px solid transparent',
            }}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            <span>{label}</span>
            {active && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />}
          </button>
        );
      })}

      {/* Sign Out — prominent */}
      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.25)',
            cursor: 'pointer', background: 'rgba(239,68,68,0.08)',
            color: '#ef4444', fontWeight: 700, fontSize: '0.9rem',
            textAlign: 'left', width: '100%', transition: 'all 0.18s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.16)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
        >
          <LogOut size={18} style={{ flexShrink: 0 }} />
          <span>Sign Out</span>
        </button>
      </div>
    </nav>
  );

  return (
    <>
      <style>{`
        .expert-shell { display: flex; min-height: 100vh; background: var(--bg-main); }

        /* ── Sidebar ── */
        .expert-sidebar {
          width: 240px; flex-shrink: 0;
          background: var(--bg-card);
          border-right: 1px solid var(--border-light);
          display: flex; flex-direction: column;
          position: sticky; top: 0; height: 100vh;
          overflow-y: auto; z-index: 200;
        }
        .expert-sidebar-logo {
          padding: 1.4rem 1.2rem 1rem;
          border-bottom: 1px solid var(--border-light);
        }
        .expert-sidebar-avatar {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 1rem 1.2rem;
          border-bottom: 1px solid var(--border-light);
          margin-bottom: 0.5rem;
        }
        .expert-sidebar-nav { padding: 0.5rem 0.75rem; flex: 1; }
        .expert-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .expert-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.85rem 1.5rem;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border-light);
          position: sticky; top: 0; z-index: 100;
        }
        .expert-content { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }

        /* ── Mobile drawer ── */
        .expert-drawer-overlay {
          display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.55);
          z-index: 400; backdrop-filter: blur(4px);
        }
        .expert-drawer {
          position: fixed; left: 0; top: 0; bottom: 0; width: 260px;
          background: var(--bg-card); z-index: 500;
          padding: 1.25rem; overflow-y: auto;
          box-shadow: 4px 0 24px rgba(0,0,0,0.3);
          transform: translateX(-100%); transition: transform 0.28s ease;
        }

        @media (max-width: 768px) {
          .expert-sidebar { display: none; }
          .expert-drawer-overlay { display: block; }
          .expert-drawer.open { transform: translateX(0); }
          .expert-content { padding: 1rem; }
          .expert-topbar { padding: 0.75rem 1rem; }
          .kpi-grid { grid-template-columns: 1fr 1fr !important; }
          .appt-actions { flex-wrap: wrap !important; gap: 0.35rem !important; }
          .service-grid { grid-template-columns: 1fr !important; }
          .avail-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }

        .kpi-card {
          border-radius: 16px; padding: 1.25rem;
          background: var(--bg-card); border: 1px solid var(--border-light);
          display: flex; flex-direction: column; gap: 0.5rem;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
        .expert-appt-card {
          padding: 1.1rem 1.25rem; border-radius: 14px;
          background: var(--bg-card); border: 1px solid var(--border-light);
          transition: box-shadow 0.15s ease;
        }
        .expert-appt-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }

        /* activation pulse */
        @keyframes softPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(245,158,11,0); }
        }
        .activation-pulse { animation: softPulse 2.5s ease-in-out infinite; }
      `}</style>



      <div className="expert-shell">

        {/* ── Desktop Sidebar ── */}
        <aside className="expert-sidebar">
          {/* Logo */}
          <div className="expert-sidebar-logo">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={17} color="#fff" />
              </div>
              <div>
                <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', letterSpacing: '0.03em' }}>D.WORLD</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Expert Portal</div>
              </div>
            </div>
          </div>

          {/* Avatar */}
          <div className="expert-sidebar-avatar">
            <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(99,102,241,0.3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem', color: 'var(--secondary)', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.87rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Expert'}</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {user?.isActivated
                  ? <><Shield size={11} color="#10b981" /> Active</>
                  : <><Shield size={11} color="#f59e0b" /> Pending Activation</>}
              </div>
            </div>
          </div>

          {/* Nav */}
          <div className="expert-sidebar-nav">
            <SideNav />
          </div>
        </aside>

        {/* ── Mobile Drawer ── */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <div className="expert-drawer-overlay" onClick={() => setSidebarOpen(false)} />
              <motion.div
                className="expert-drawer open"
                initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>D.WORLD</div>
                  <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
                    <X size={20} />
                  </button>
                </div>
                {/* mobile avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border-light)', marginBottom: '0.75rem' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(99,102,241,0.3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--secondary)' }}>{initials}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>{user?.name || 'Expert'}</div>
                    <div style={{ fontSize: '0.72rem', color: '#10b981' }}>{user?.isActivated ? '✓ Activated' : '⚠ Pending'}</div>
                  </div>
                </div>
                <SideNav mobile />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Main Content Area ── */}
        <div className="expert-main">

          {/* Top Bar */}
          <header className="expert-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* hamburger — mobile only */}
              <button
                onClick={() => setSidebarOpen(true)}
                style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', '@media(max-width:768px)': { display: 'flex' } }}
                className="mobile-menu-btn"
                id="expert-hamburger"
              >
                <Menu size={22} />
              </button>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-main)' }}>
                  {NAV_ITEMS.find(n => n.key === activeTab)?.label || 'Dashboard'}
                </h1>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {/* Activation badge */}
              {user?.role === 'expert' && !user?.isActivated && (
                <button
                  onClick={() => setShowActivationModal(true)}
                  className="activation-pulse"
                  style={{ padding: '0.45rem 0.85rem', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '9999px', color: '#d97706', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
                >
                  ⚡ Activate (₦3,000)
                </button>
              )}

              {/* Sign-out button — always visible in top bar */}
              <button
                onClick={handleLogout}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.18s ease' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
              >
                <LogOut size={15} />
                <span className="signout-label">Sign Out</span>
              </button>
            </div>
          </header>

          {/* hamburger visible on mobile via CSS */}
          <style>{`
            #expert-hamburger { display: none; }
            @media (max-width: 768px) {
              #expert-hamburger { display: flex !important; }
              .signout-label { display: none; }
            }
          `}</style>

          {/* Main Content */}
          <main className="expert-content">

            {/* ── KPI Stats ── */}
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem' }}>
              {[
                { label: 'Confirmed', value: approvedApps, color: 'var(--primary)', bg: 'rgba(99,102,241,0.1)', icon: CalendarCheck },
                { label: 'Pending', value: pendingApps, color: '#d97706', bg: 'rgba(245,158,11,0.1)', icon: Clock },
                { label: 'Completed', value: completedApps, color: '#059669', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle },
                { label: 'Paid Earnings', value: `₦${paidEarnings.toLocaleString()}`, color: 'white', bg: 'linear-gradient(135deg, var(--primary), var(--secondary))', icon: TrendingUp, gradient: true },
              ].map(({ label, value, color, bg, icon: Icon, gradient }) => (
                <div key={label} className="kpi-card" style={{ background: bg, border: gradient ? 'none' : '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: gradient ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                    <Icon size={16} color={gradient ? 'rgba(255,255,255,0.8)' : color} />
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color, fontFamily: 'Outfit', lineHeight: 1.1 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* ── Activation Banner ── */}
            {user?.role === 'expert' && user?.isActivated === false && (
              <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(239,68,68,0.06))', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '16px', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ padding: '0.55rem', background: '#fef3c7', borderRadius: '10px', color: '#b45309' }}><Shield size={20} /></div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#b45309', fontFamily: 'Outfit' }}>Activate Your Provider Account</h4>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Pay the one-time ₦3,000 verification fee to unlock client bookings.</p>
                  </div>
                </div>
                <button onClick={() => setShowActivationModal(true)} className="btn btn-primary" style={{ background: '#d97706', borderColor: '#b45309', padding: '0.6rem 1.25rem', fontSize: '0.875rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  Activate Now — ₦3,000
                </button>
              </div>
            )}

            {/* ── Tab Content ── */}
            {loading ? (
              <div style={{ padding: '4rem', textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid var(--border-light)', borderTop: '3px solid var(--primary)', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading your workspace...</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

                  {/* ─── APPOINTMENTS ─── */}
                  {activeTab === 'appointments' && (
                    <div className="app-card">
                      <div className="card-header" style={{ justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <CalendarRange size={20} color="var(--primary)" />
                          <h3 style={{ margin: 0 }}>Assigned Appointments</h3>
                        </div>
                        <span style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem', borderRadius: '9999px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', fontWeight: 700 }}>
                          {appointments.length} total
                        </span>
                      </div>
                      <div className="card-body" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {appointments.length > 0 ? appointments.map(app => (
                          <div key={app.id || app._id} className="expert-appt-card">
                            {/* Top */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                                  <User size={20} />
                                </div>
                                <div>
                                  <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', display: 'block', fontFamily: 'Outfit' }}>
                                    {app.user_id?.name || app.client_name || 'Client'}
                                  </span>
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    {app.service_id?.name || 'Session'} · <strong>₦{(app.service_id?.price || 0).toLocaleString()}</strong>
                                  </span>
                                </div>
                              </div>
                              <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: statusBg(app.status), color: statusColor(app.status) }}>
                                {app.status}
                              </span>
                            </div>
                            {/* Date */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                              <Clock size={13} color="var(--primary)" /> {app.date} at {app.time}
                              {app.paymentStatus === 'paid' && <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', background: 'rgba(16,185,129,0.12)', color: '#059669', fontWeight: 700 }}>PAID</span>}
                            </div>
                            {/* Actions */}
                            <div className="appt-actions" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <button onClick={() => setChatAppointment(app)} style={{ padding: '0.38rem 0.7rem', fontSize: '0.775rem', color: 'var(--primary)', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                                <MessageSquare size={12} /> Chat
                              </button>
                              <a href={getGoogleCalendarUrl(app)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.38rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', minHeight: '32px' }}>
                                <Calendar size={12} color="var(--primary)" /> Cal
                              </a>
                              <button onClick={() => downloadIcsFile(app)} className="btn btn-secondary" style={{ padding: '0.38rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', minHeight: '32px' }}>
                                <Download size={12} color="var(--secondary)" /> .ics
                              </button>
                              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.35rem' }}>
                                {app.status !== 'approved' && app.status !== 'completed' && (
                                  <button onClick={() => handleUpdateStatus(app.id || app._id, 'approved')} className="btn btn-secondary" style={{ padding: '0.38rem 0.65rem', fontSize: '0.775rem', color: '#059669', minHeight: '32px' }}>
                                    <CheckCircle size={13} /> Accept
                                  </button>
                                )}
                                {app.status === 'approved' && (
                                  <button onClick={() => handleUpdateStatus(app.id || app._id, 'completed')} className="btn btn-primary" style={{ padding: '0.38rem 0.65rem', fontSize: '0.775rem', minHeight: '32px' }}>
                                    <CheckCircle size={13} /> Done
                                  </button>
                                )}
                                {app.status !== 'cancelled' && app.status !== 'completed' && (
                                  <button onClick={() => handleUpdateStatus(app.id || app._id, 'cancelled')} className="btn btn-secondary" style={{ padding: '0.38rem 0.55rem', fontSize: '0.775rem', color: '#ef4444', minHeight: '32px' }}>
                                    <XCircle size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <CalendarRange size={40} style={{ opacity: 0.25, marginBottom: '1rem' }} />
                            <p style={{ fontWeight: 600 }}>No appointments yet</p>
                            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Client bookings will appear here once you're activated.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ─── SERVICES ─── */}
                  {activeTab === 'services' && (
                    <div className="app-card">
                      <div className="card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <Briefcase size={20} color="var(--secondary)" />
                          <div>
                            <h3 style={{ margin: 0 }}>Registered Specialty Service</h3>
                            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              Each expert specializes in exactly 1 single service on D.world.
                            </p>
                          </div>
                        </div>
                        <span style={{
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          padding: '0.35rem 0.85rem',
                          borderRadius: '999px',
                          background: 'rgba(124, 58, 237, 0.1)',
                          color: 'var(--secondary)',
                          border: '1px solid rgba(124, 58, 237, 0.25)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}>
                          ⚡ 1 Verified Specialty
                        </span>
                      </div>
                      <div className="card-body" style={{ padding: '1.25rem' }}>
                        {services.length > 0 ? (
                          <div className="service-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                            {services.map(service => (
                              <div key={service._id || service.id} style={{ padding: '1.25rem', borderRadius: '16px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div>
                                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontFamily: 'Outfit', fontWeight: 800 }}>{service.name}</h4>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.15rem' }}>
                                      {service.category || 'Specialty Service'}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--secondary)', whiteSpace: 'nowrap' }}>₦{service.price?.toLocaleString()}</span>
                                </div>
                                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>{service.description || 'Verified campus specialist appointment service.'}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={13} /> {service.duration || 45} min</span>
                                  <span>·</span>
                                  <span>{service.location || 'Campus Studio / Main Salon'}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.85rem' }}>
                                  <button onClick={() => handleEditService(service)} className="btn btn-primary" style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                    <Edit size={14} /> Edit Pricing & Details
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Briefcase size={40} style={{ opacity: 0.25, marginBottom: '1rem' }} />
                            <p style={{ fontWeight: 600 }}>Your specialty service was configured at registration.</p>
                            <p style={{ fontSize: '0.85rem' }}>Contact campus admin if you need to reassign your specialty.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ─── AVAILABILITY ─── */}
                  {activeTab === 'availability' && (
                    <div className="app-card" style={{ maxWidth: '700px' }}>
                      <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{ padding: '0.45rem', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', color: 'var(--primary)' }}><Clock size={18} /></div>
                          <div>
                            <h3 style={{ margin: 0 }}>Availability & Working Hours</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Control which days & hours clients can book you</p>
                          </div>
                        </div>
                      </div>
                      <div className="card-body" style={{ padding: '1.5rem' }}>
                        <form onSubmit={handleSaveAvailability}>
                          <div style={{ marginBottom: '1.75rem' }}>
                            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}>Available Days</label>
                            <div className="avail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: '0.65rem' }}>
                              {ALL_DAYS.map(day => {
                                const on = workingDays.includes(day);
                                return (
                                  <button key={day} type="button" onClick={() => toggleDay(day)} style={{ padding: '0.85rem 0.65rem', borderRadius: '12px', border: on ? '2px solid var(--primary)' : '1px solid var(--border-light)', background: on ? 'rgba(99,102,241,0.1)' : 'transparent', color: on ? 'var(--primary)' : 'var(--text-muted)', fontWeight: on ? 700 : 500, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', transition: 'all 0.15s ease' }}>
                                    <span>{day.slice(0,3)}</span>
                                    <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.5rem', borderRadius: '9999px', background: on ? '#10b981' : '#64748b', color: '#fff' }}>{on ? 'Open' : 'Off'}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div style={{ marginBottom: '1.75rem' }}>
                            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}>Daily Hours</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Sun size={13} color="#f59e0b" /> Opening</label>
                                <input type="time" value={workingHours.start} onChange={e => setWorkingHours({ ...workingHours, start: e.target.value })} required style={{ padding: '0.75rem 1rem', borderRadius: '10px' }} />
                              </div>
                              <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Moon size={13} color="#6366f1" /> Closing</label>
                                <input type="time" value={workingHours.end} onChange={e => setWorkingHours({ ...workingHours, end: e.target.value })} required style={{ padding: '0.75rem 1rem', borderRadius: '10px' }} />
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" disabled={savingAvailability} className="btn btn-primary" style={{ padding: '0.75rem 1.75rem' }}>
                              {savingAvailability ? 'Saving...' : 'Save Schedule'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* ─── WALLET ─── */}
                  {activeTab === 'wallet' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {/* Balance Hero Card with Paystack Top-Up Trigger */}
                      <div style={{
                        borderRadius: '20px',
                        padding: '2.25rem 2rem',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1.25rem',
                        boxShadow: '0 12px 35px -5px rgba(79, 70, 229, 0.4)'
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.85, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                              Available Wallet Balance
                            </p>
                            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '99px', background: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>
                              Instant Paystack
                            </span>
                          </div>
                          <h2 style={{ margin: '0.2rem 0 0', fontSize: '2.75rem', fontFamily: 'Outfit', fontWeight: 900, letterSpacing: '-0.02em' }}>
                            ₦{Number(walletBalance || 0).toLocaleString()}
                          </h2>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setIsWalletModalOpen(true)}
                            type="button"
                            className="btn"
                            style={{
                              background: '#ffffff',
                              color: '#4338ca',
                              fontWeight: 800,
                              fontSize: '0.92rem',
                              border: 'none',
                              padding: '0.75rem 1.4rem',
                              borderRadius: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              cursor: 'pointer',
                              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
                              transition: 'transform 0.15s ease'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                          >
                            <Plus size={18} strokeWidth={2.5} /> Top Up Wallet
                          </button>
                          <div style={{
                            padding: '0.9rem',
                            background: 'rgba(255, 255, 255, 0.18)',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Wallet size={30} color="white" />
                          </div>
                        </div>
                      </div>

                      {/* Transactions List */}
                      <div className="app-card">
                        <div className="card-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ margin: 0 }}>Wallet Activity & History</h3>
                            <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              Earnings from client appointments & Paystack top-ups
                            </p>
                          </div>
                          <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', borderRadius: '999px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {walletTransactions.length} records
                          </span>
                        </div>
                        <div className="card-body" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          {walletTransactions.length > 0 ? (
                            walletTransactions.slice().reverse().map((tx, i) => {
                              const isPositive = tx.type === 'earning' || tx.type === 'deposit' || tx.type === 'refund';
                              return (
                                <div
                                  key={i}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.9rem 1.15rem',
                                    borderRadius: '14px',
                                    background: 'var(--bg-main)',
                                    border: '1px solid var(--border-light)',
                                    gap: '1rem'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: '10px',
                                      background: tx.type === 'deposit'
                                        ? 'rgba(99, 102, 241, 0.15)'
                                        : isPositive
                                        ? 'rgba(16, 185, 129, 0.15)'
                                        : 'rgba(239, 68, 68, 0.15)',
                                      color: tx.type === 'deposit'
                                        ? '#6366f1'
                                        : isPositive
                                        ? '#10b981'
                                        : '#ef4444',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}>
                                      {tx.type === 'deposit' ? <Wallet size={16} /> : isPositive ? <ArrowDownLeft size={16} /> : <ArrowDownLeft size={16} style={{ transform: 'rotate(180deg)' }} />}
                                    </div>
                                    <div>
                                      <span style={{ fontWeight: 700, fontSize: '0.875rem', display: 'block', color: 'var(--text-main)' }}>
                                        {tx.description}
                                      </span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                          {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                        <span style={{
                                          fontSize: '0.65rem',
                                          fontWeight: 800,
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                          background: tx.type === 'deposit' ? '#e0e7ff' : '#dcfce7',
                                          color: tx.type === 'deposit' ? '#4338ca' : '#15803d',
                                          textTransform: 'uppercase'
                                        }}>
                                          {tx.type === 'deposit' ? 'Paystack Top-up' : tx.type}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <strong style={{
                                    color: isPositive ? '#10b981' : '#ef4444',
                                    fontSize: '1rem',
                                    fontWeight: 800,
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {isPositive ? '+' : '-'}₦{Number(tx.amount || 0).toLocaleString()}
                                  </strong>
                                </div>
                              );
                            })
                          ) : (
                            <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                              <Wallet size={40} style={{ opacity: 0.25, marginBottom: '0.85rem' }} />
                              <p style={{ fontWeight: 600, margin: 0 }}>No transactions yet</p>
                              <p style={{ fontSize: '0.825rem', marginTop: '0.25rem' }}>
                                Top up your wallet using Paystack or complete appointments to record earnings.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─── PROFILE ─── */}
                  {activeTab === 'profile' && (
                    <div className="app-card" style={{ maxWidth: '580px' }}>
                      <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(99,102,241,0.25))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: 'var(--secondary)' }}>{initials}</div>
                          <div>
                            <h3 style={{ margin: 0 }}>Profile Settings</h3>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user?.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="card-body">
                        <form onSubmit={submitProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>Display Name</label>
                            <input type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} required />
                          </div>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>Contact Phone</label>
                            <input type="text" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
                            <button type="submit" disabled={savingProfile} className="btn btn-primary">
                              {savingProfile ? 'Saving...' : 'Save Profile'}
                            </button>
                            <button type="button" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                              <LogOut size={15} /> Sign Out
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </div>
      </div>

      {/* ── Service Modal ── */}
      <AnimatePresence>
        {isServiceModalOpen && (
          <div className="modal-overlay" onClick={() => setIsServiceModalOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()} className="modal-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontFamily: 'Outfit' }}>Edit Specialty Service</h3>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Update your price, duration, and service description.
                  </p>
                </div>
                <button onClick={() => setIsServiceModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <form onSubmit={submitService} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Service Title</label>
                  <input type="text" name="name" value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, [e.target.name]: e.target.value })} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Category</label>
                    <select name="category" value={serviceForm.category} onChange={e => setServiceForm({ ...serviceForm, [e.target.name]: e.target.value })} style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border-light)', width: '100%', background: 'var(--bg-input, var(--bg-card))' }}>
                      {['Hair Packages','Nail Packages','Lash Packages','Makeup Packages','Male Grooming','Academic','Technical'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Location</label>
                    <input type="text" name="location" value={serviceForm.location} onChange={e => setServiceForm({ ...serviceForm, [e.target.name]: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Price (₦)</label>
                    <input type="number" name="price" value={serviceForm.price} onChange={e => setServiceForm({ ...serviceForm, [e.target.name]: e.target.value })} required />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Duration (min)</label>
                    <input type="number" name="duration" value={serviceForm.duration} onChange={e => setServiceForm({ ...serviceForm, [e.target.name]: e.target.value })} required />
                  </div>
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Description</label>
                  <textarea rows="3" name="description" value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, [e.target.name]: e.target.value })} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setIsServiceModalOpen(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Chat Modal ── */}
      <AppointmentChatModal isOpen={Boolean(chatAppointment)} onClose={() => setChatAppointment(null)} appointment={chatAppointment} />

      {/* ── Activation Modal ── */}
      <ExpertActivationModal
        isOpen={user?.role === 'expert' && !user?.isActivated && (!activationDismissed || showActivationModal)}
        user={user}
        onClose={() => { setActivationDismissed(true); setShowActivationModal(false); }}
        onActivated={() => { setShowActivationModal(false); setActivationDismissed(false); if (refreshUser) refreshUser(); addToast('Account activated! 🎉', 'success'); }}
      />

      {/* ── Wallet Modal (Paystack Top Up) ── */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onWalletUpdated={(newBal) => {
          setWalletBalance(newBal);
          fetchWallet();
        }}
      />

      {/* Sticky bottom pill when dismissed but not activated */}
      {user?.role === 'expert' && !user?.isActivated && activationDismissed && !showActivationModal && (
        <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 8px 24px rgba(99,102,241,0.45)', zIndex: 9998, fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
          <span>🔒 Account not activated</span>
          <button onClick={() => setShowActivationModal(true)} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', borderRadius: '9999px', padding: '0.3rem 0.9rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
            Pay ₦3,000 →
          </button>
        </div>
      )}
    </>
  );
};

export default ExpertDashboard;
