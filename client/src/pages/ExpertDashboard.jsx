import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Settings,
  Images,
  Upload,
  Link as LinkIcon,
  Eye,
  ImageOff,
  Camera,
  ZoomIn,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import AppointmentChatModal from '../components/AppointmentChatModal';
import ExpertActivationModal from '../components/ExpertActivationModal';
import WalletModal from '../components/WalletModal';
import ConfirmModal from '../components/ConfirmModal';
import ImageLightboxModal from '../components/ImageLightboxModal';
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
  { key: 'appointments', label: 'Schedule',          icon: CalendarRange },
  { key: 'professional', label: 'Professional Page', icon: Sparkles },
  { key: 'services',     label: 'Services',          icon: Briefcase },
  { key: 'availability', label: 'Hours',             icon: Clock },
  { key: 'wallet',       label: 'Wallet',            icon: Wallet },
  { key: 'profile',      label: 'Profile',           icon: User },
];

const ExpertDashboard = () => {
  const { user, setUser, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationDismissed, setActivationDismissed] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'appointments';

  // Instant cache read from sessionStorage
  const hasCachedData = (() => {
    try {
      return !!sessionStorage.getItem('dworld_expert_appointments');
    } catch { return false; }
  })();

  const [appointments, setAppointments] = useState(() => {
    try {
      const raw = sessionStorage.getItem('dworld_expert_appointments');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [services, setServices] = useState(() => {
    try {
      const raw = sessionStorage.getItem('dworld_expert_services');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [walletBalance, setWalletBalance] = useState(() => {
    try {
      const raw = sessionStorage.getItem('dworld_expert_wallet_bal');
      if (raw !== null) return JSON.parse(raw);
    } catch {}
    return user?.walletBalance || 0;
  });
  const [walletTransactions, setWalletTransactions] = useState(() => {
    try {
      const raw = sessionStorage.getItem('dworld_expert_wallet_txs');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  // If cached data is present, display instantly (loading=false); otherwise show skeleton on frame 1 (loading=true)
  const [loading, setLoading] = useState(!hasCachedData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dataReady, setDataReady] = useState(hasCachedData);

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

  // Service Modal State (Edit Only)
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', duration: '45', price: '', location: 'Main Studio', category: 'Hair Packages' });
  const [editingServiceId, setEditingServiceId] = useState(null);

  // Lookbook / Portfolio
  const [portfolio, setPortfolio] = useState(user?.portfolio || []);
  const [portfolioForm, setPortfolioForm] = useState({ title: '', description: '', imageUrl: '', category: user?.specialty || 'Hair Styling' });
  const [portfolioSubmitting, setPortfolioSubmitting] = useState(false);
  const [portfolioPreview, setPortfolioPreview] = useState(null);

  // Edit Lookbook Photo Modal State
  const [editPortfolioModal, setEditPortfolioModal] = useState({
    isOpen: false,
    itemId: null,
    title: '',
    description: '',
    imageUrl: '',
    previewUrl: '',
    submitting: false
  });
  const editPortfolioFileRef = useRef(null);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger',
    onConfirm: null
  });

  const { notify } = useNotify();
  const addToast = (message, type = 'success') => {
    if (type === 'error') notify.error(message);
    else if (type === 'info') notify.info(message);
    else if (type === 'warning') notify.warning(message);
    else notify.success(message);
  };

  const openLightbox = (imageUrl, title = 'Specialist Photo', subtitle = '') => {
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
      addToast('Image exceeds 10MB limit. Please choose a smaller photo.', 'warning');
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
          addToast('Specialist avatar updated successfully! 📸', 'success');
        }
      } catch (err) {
        addToast(err.response?.data?.message || 'Failed to update avatar.', 'error');
      } finally {
        setAvatarUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Lookbook File Upload Ref & Handler
  const lookbookFileInputRef = useRef(null);

  const handleLookbookFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      addToast('Image size exceeds 15MB limit. Please choose a smaller photo.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result;
      setPortfolioForm(prev => ({ ...prev, imageUrl: base64Data }));
      setPortfolioPreview(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const [profileForm, setProfileForm] = useState({ 
    name: user?.name || '', 
    phone: user?.phone || '',
    address: user?.address || user?.location || '',
    bio: user?.bio || '',
    specialty: user?.specialty || ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || user.location || '',
        bio: user.bio || '',
        specialty: user.specialty || ''
      });
    }
  }, [user]);

  const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [workingDays, setWorkingDays] = useState(
    user?.workingDays?.length > 0 ? user.workingDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  );
  const [workingHours, setWorkingHours] = useState({ start: user?.workingHours?.start || '09:00', end: user?.workingHours?.end || '18:00' });
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [chatAppointment, setChatAppointment] = useState(null);

  // 1. Initial mount fetch (runs once on load, loads stale cache instantly and revalidates)
  useEffect(() => { 
    fetchData(); 
  }, []);

  // 2. Paystack activation return check (runs only when payment callback params exist)
  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    const isActParam = searchParams.get('activated');
    if (reference) {
      axios.post(`${API_URL}/payments/verify`, { reference })
        .then(res => {
          if (res.data.success) {
            addToast('Congratulations! Your Expert profile is now fully activated 🎉', 'success');
            setShowActivationModal(false);
            setActivationDismissed(false);
            if (refreshUser) refreshUser();
            fetchData(true);
            navigate('/expert', { replace: true });
          }
        })
        .catch(err => {
          console.warn('Activation verify notice:', err);
        });
    } else if (isActParam) {
      if (refreshUser) refreshUser();
      fetchData(true);
      navigate('/expert', { replace: true });
    }
  }, [searchParams]);

  // Single batched fetch — all calls fire in parallel, stale-while-revalidate pattern
  const fetchData = async (forceShowLoading = false) => {
    const hasCache = !!sessionStorage.getItem('dworld_expert_appointments');
    if (!hasCache || forceShowLoading) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const [appRes, srvRes, walletRes] = await Promise.all([
        axios.get(`${API_URL}/appointments/stylist-dashboard`),
        axios.get(`${API_URL}/services/my-services`),
        axios.get(`${API_URL}/auth/wallet`)
      ]);
      if (appRes.data.success) {
        const apts = appRes.data.data.appointments || [];
        setAppointments(apts);
        sessionStorage.setItem('dworld_expert_appointments', JSON.stringify(apts));
      }
      if (srvRes.data.success) {
        const srvs = srvRes.data.data || [];
        setServices(srvs);
        sessionStorage.setItem('dworld_expert_services', JSON.stringify(srvs));
      }
      if (walletRes.data.success) {
        const bal = walletRes.data.data.walletBalance || 0;
        const txs = walletRes.data.data.transactions || [];
        setWalletBalance(bal);
        setWalletTransactions(txs);
        sessionStorage.setItem('dworld_expert_wallet_bal', JSON.stringify(bal));
        sessionStorage.setItem('dworld_expert_wallet_txs', JSON.stringify(txs));
      }
      // Sync availability from AuthContext user (no extra /auth/me call needed)
      if (user?.workingDays) setWorkingDays(user.workingDays);
      if (user?.workingHours) setWorkingHours(user.workingHours);
    } catch (err) { 
      console.error('Error fetching expert data', err); 
    } finally { 
      setLoading(false); 
      setIsRefreshing(false);
      setDataReady(true);
    }
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
    // Optimistic status update
    setAppointments(prev => prev.map(a => (a._id === id || a.id === id) ? { ...a, status } : a));
    try {
      const res = await axios.patch(`${API_URL}/appointments/${id}/status`, { status });
      if (res.data.success) { 
        addToast(`Appointment marked as ${status}! ✨`, 'success'); 
        fetchData(); 
      }
    } catch (err) { 
      addToast('Failed to update appointment status.', 'error'); 
      fetchData(); // Rollback
    }
  };

  const handleDeleteAppointment = (appointmentId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Appointment Record?',
      message: 'Are you sure you want to remove this appointment from your schedule? If paid and not yet completed, the client will be automatically refunded.',
      confirmText: 'Delete Appointment',
      type: 'danger',
      onConfirm: async () => {
        // Optimistic deletion
        setAppointments(prev => prev.filter(a => a._id !== appointmentId && a.id !== appointmentId));
        try {
          const res = await axios.delete(`${API_URL}/appointments/${appointmentId}`);
          if (res.data.success) {
            addToast('Appointment removed from schedule.', 'info');
            fetchData();
          }
        } catch (err) {
          addToast(err.response?.data?.message || 'Failed to delete appointment.', 'error');
          fetchData(); // Rollback
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
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
  const handleDeleteService = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Service Offering?',
      message: 'Are you sure you want to remove this service from your catalog? Students will no longer be able to book it.',
      confirmText: 'Delete Service',
      type: 'danger',
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/services/${id}`);
          addToast('Service removed.', 'info');
          fetchData();
        } catch (err) {
          addToast('Failed to delete.', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };
  const submitProfile = async (e) => {
    e.preventDefault(); setSavingProfile(true);
    try {
      const res = await axios.put(`${API_URL}/auth/profile`, profileForm);
      if (res.data.success) addToast('Profile saved!', 'success');
    } catch (err) { addToast('Failed to update profile.', 'error'); }
    finally { setSavingProfile(false); }
  };

  // ── Portfolio handlers ──────────────────────────────────────────────────────
  const handleAddPortfolioItem = async (e) => {
    e.preventDefault();
    if (!portfolioForm.imageUrl.trim()) { addToast('Please select a photo from your photo library or files.', 'warning'); return; }
    if (portfolio.length >= 3) {
      addToast('Your professional lookbook allows a maximum of 3 highlight pictures. Please remove an existing photo first.', 'warning');
      return;
    }
    try {
      setPortfolioSubmitting(true);
      const res = await axios.post(`${API_URL}/auth/portfolio`, portfolioForm);
      if (res.data.success) {
        setPortfolio(res.data.data);
        setPortfolioForm({ title: '', description: '', imageUrl: '', category: user?.specialty || 'Hair Styling' });
        setPortfolioPreview(null);
        addToast('Lookbook style uploaded to Cloudinary! 🎨', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to add lookbook item.', 'error');
    } finally {
      setPortfolioSubmitting(false);
    }
  };

  const handleDeletePortfolioItem = (itemId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Lookbook Photo?',
      message: 'Are you sure you want to remove this style photo from your campus lookbook?',
      confirmText: 'Remove Photo',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await axios.delete(`${API_URL}/auth/portfolio/${itemId}`);
          if (res.data.success) {
            setPortfolio(res.data.data);
            addToast('Lookbook item removed.', 'info');
          }
        } catch (err) {
          addToast('Failed to remove lookbook item.', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleOpenEditPortfolio = (item) => {
    setEditPortfolioModal({
      isOpen: true,
      itemId: item._id,
      title: item.title || '',
      description: item.description || '',
      imageUrl: item.imageUrl,
      previewUrl: item.imageUrl,
      submitting: false
    });
  };

  const handleEditPortfolioFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      addToast('Image exceeds 15MB limit.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditPortfolioModal(prev => ({ ...prev, imageUrl: reader.result, previewUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEditPortfolio = async (e) => {
    e.preventDefault();
    try {
      setEditPortfolioModal(prev => ({ ...prev, submitting: true }));
      const payload = {
        title: editPortfolioModal.title,
        description: editPortfolioModal.description,
        imageUrl: editPortfolioModal.imageUrl
      };
      const res = await axios.put(`${API_URL}/auth/portfolio/${editPortfolioModal.itemId}`, payload);
      if (res.data.success) {
        setPortfolio(res.data.data);
        setUser(prev => ({ ...prev, portfolio: res.data.data }));
        addToast('Lookbook photo updated! 🎨', 'success');
        setEditPortfolioModal(prev => ({ ...prev, isOpen: false }));
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update lookbook photo.', 'error');
    } finally {
      setEditPortfolioModal(prev => ({ ...prev, submitting: false }));
    }
  };

  const { pendingApps, approvedApps, completedApps, paidEarnings } = useMemo(() => {
    let pending = 0, approved = 0, completed = 0, earnings = 0;
    for (let i = 0; i < appointments.length; i++) {
      const a = appointments[i];
      if (a.status === 'pending') pending++;
      else if (a.status === 'approved') approved++;
      else if (a.status === 'completed') completed++;

      if (a.paymentStatus === 'paid') {
        earnings += (a.expertPayout || Math.round((parseFloat(a.service_id?.price) || 0) * 0.90));
      }
    }
    return { pendingApps: pending, approvedApps: approved, completedApps: completed, paidEarnings: earnings };
  }, [appointments]);

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
          border-radius: 18px; padding: 1.25rem 1.35rem;
          background: var(--bg-card); border: 1px solid var(--border-light);
          display: flex; flex-direction: column; gap: 0.5rem;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease;
          position: relative; overflow: hidden;
        }
        .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(0,0,0,0.08); }
        .expert-appt-card {
          padding: 1.25rem 1.35rem; border-radius: 16px;
          background: var(--bg-card); border: 1px solid var(--border-light);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          position: relative;
        }
        .expert-appt-card:hover { 
          box-shadow: 0 8px 24px rgba(0,0,0,0.06); 
          border-color: rgba(99,102,241,0.25);
        }
        .expert-appt-card.status-pending { border-left: 4px solid #f59e0b; }
        .expert-appt-card.status-approved { border-left: 4px solid #10b981; }
        .expert-appt-card.status-completed { border-left: 4px solid #6366f1; }
        .expert-appt-card.status-cancelled { border-left: 4px solid #ef4444; opacity: 0.82; }

        /* activation pulse */
        @keyframes softPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(245,158,11,0); }
        }
        .activation-pulse { animation: softPulse 2.5s ease-in-out infinite; }

        /* skeleton shimmer */
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.04) 0%,
            rgba(255,255,255,0.12) 40%,
            rgba(255,255,255,0.04) 80%
          );
          background-size: 800px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
          border-radius: 8px;
        }
      `}</style>



      <div className="expert-shell">

        {/* ── Desktop Sidebar ── */}
        <aside className="expert-sidebar">
          {/* Logo */}
          <div className="expert-sidebar-logo">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <img 
                src="/logo-sm.png" 
                alt="D.WORLD Logo" 
                width="34"
                height="34"
                loading="eager"
                decoding="async"
                style={{ 
                  width: 34, 
                  height: 34, 
                  borderRadius: 10, 
                  objectFit: 'cover', 
                  flexShrink: 0, 
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                  transform: 'translateZ(0)',
                  willChange: 'transform'
                }} 
              />
              <div>
                <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', letterSpacing: '0.03em' }}>D.WORLD</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Expert Portal</div>
              </div>
            </div>
          </div>

          {/* Avatar */}
          <div className="expert-sidebar-avatar">
            <div 
              onClick={() => user?.avatar && openLightbox(user.avatar, user?.name, 'Specialist Profile Photo')}
              style={{ 
                width: 38, 
                height: 38, 
                borderRadius: '10px', 
                background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(99,102,241,0.3))', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 800, 
                fontSize: '0.95rem', 
                color: 'var(--secondary)', 
                flexShrink: 0,
                overflow: 'hidden',
                cursor: user?.avatar ? 'zoom-in' : 'default',
                border: '1.5px solid rgba(168,85,247,0.3)'
              }}
              title={user?.avatar ? "Click to view full photo" : user?.name}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
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
                  <div 
                    onClick={() => user?.avatar && openLightbox(user.avatar, user?.name, 'Specialist Profile Photo')}
                    style={{ 
                      width: 38, 
                      height: 38, 
                      borderRadius: '10px', 
                      background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(99,102,241,0.3))', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: 800, 
                      color: 'var(--secondary)',
                      overflow: 'hidden',
                      cursor: user?.avatar ? 'zoom-in' : 'default',
                      border: '1.5px solid rgba(168,85,247,0.3)'
                    }}
                    title={user?.avatar ? "Click to view full photo" : user?.name}
                  >
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      initials
                    )}
                  </div>
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

              {/* Profile Avatar in Header */}
              <button
                type="button"
                onClick={() => {
                  if (user?.avatar) {
                    openLightbox(user.avatar, user?.name || 'Specialist Profile', 'Verified D.WORLD Specialist Photo');
                  } else {
                    setSearchParams({ tab: 'profile' });
                  }
                }}
                title={user?.avatar ? `Tap to view photo: ${user.name}` : `View Profile Settings`}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid var(--secondary)',
                  boxShadow: '0 0 0 3px rgba(168, 85, 247, 0.2)',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, var(--secondary), var(--primary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  fontFamily: 'Outfit, sans-serif',
                  flexShrink: 0,
                  padding: 0,
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.07)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(168, 85, 247, 0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(168, 85, 247, 0.2)'; }}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name || 'Expert'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>{initials}</span>
                )}
              </button>

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

            {/* ── Studio Overview Hero Banner ── */}
            <div style={{
              borderRadius: '20px',
              padding: '1.4rem 1.6rem',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.06) 50%, rgba(16,185,129,0.04) 100%)',
              border: '1px solid rgba(99,102,241,0.16)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--text-main)' }}>
                    Welcome back, {user?.name?.split(' ')[0] || 'Specialist'} 👋
                  </h2>
                  {user?.isActivated ? (
                    <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.65rem', borderRadius: '999px', background: 'rgba(16,185,129,0.12)', color: '#059669', fontWeight: 800, border: '1px solid rgba(16,185,129,0.25)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Shield size={11} /> Verified Provider
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.65rem', borderRadius: '999px', background: 'rgba(245,158,11,0.12)', color: '#d97706', fontWeight: 800, border: '1px solid rgba(245,158,11,0.25)' }}>
                      ⚡ Pending Activation
                    </span>
                  )}
                  {isRefreshing && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      ● Updating in background...
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  {user?.specialty || 'Campus Specialist'} · {appointments.length} total client bookings
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setSearchParams({ tab: 'availability' })}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.6rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                >
                  <Clock size={14} color="var(--primary)" /> Studio Hours
                </button>
                <button
                  type="button"
                  onClick={() => setSearchParams({ tab: 'wallet' })}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.6rem 1.15rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(99,102,241,0.28)',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12))',
                    color: 'var(--primary)',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Wallet size={14} /> Wallet: ₦{Number(walletBalance || 0).toLocaleString()}
                </button>
              </div>
            </div>

            {/* ── KPI Stats Bento ── */}
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem' }}>
              {loading ? [
                { label: 'Confirmed', sub: 'Upcoming Sessions' },
                { label: 'Pending', sub: 'Requires Action' },
                { label: 'Completed', sub: 'Finished Services' },
                { label: 'Paid Earnings', sub: 'Available Payout', gradient: true }
              ].map(({ label, sub, gradient }) => (
                <div key={label} className="kpi-card" style={{ padding: '1.25rem', borderRadius: '18px', background: gradient ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'var(--bg-card)', border: gradient ? 'none' : '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: gradient ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                    <div className="skeleton-shimmer" style={{ width: 34, height: 34, borderRadius: 10 }} />
                  </div>
                  <div className="skeleton-shimmer" style={{ height: '2.1rem', width: '55%', borderRadius: 8, marginTop: '0.65rem' }} />
                  <div className="skeleton-shimmer" style={{ height: '0.8rem', width: '70%', borderRadius: 4, marginTop: '0.35rem' }} />
                </div>
              )) : [
                { 
                  label: 'Confirmed', 
                  sub: 'Upcoming Sessions', 
                  value: approvedApps, 
                  color: 'var(--primary)', 
                  bg: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.02))', 
                  border: 'rgba(99,102,241,0.22)',
                  icon: CalendarCheck, 
                  iconBg: 'rgba(99,102,241,0.14)',
                  tab: 'appointments'
                },
                { 
                  label: 'Pending', 
                  sub: 'Awaiting Action', 
                  value: pendingApps, 
                  color: '#d97706', 
                  bg: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))', 
                  border: 'rgba(245,158,11,0.25)',
                  icon: Clock, 
                  iconBg: 'rgba(245,158,11,0.14)',
                  badge: pendingApps > 0 ? `${pendingApps} new` : null,
                  tab: 'appointments'
                },
                { 
                  label: 'Completed', 
                  sub: 'Delivered Services', 
                  value: completedApps, 
                  color: '#059669', 
                  bg: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))', 
                  border: 'rgba(16,185,129,0.22)',
                  icon: CheckCircle, 
                  iconBg: 'rgba(16,185,129,0.14)',
                  tab: 'appointments'
                },
                { 
                  label: 'Paid Earnings', 
                  sub: 'Direct Net Payout', 
                  value: `₦${paidEarnings.toLocaleString()}`, 
                  color: '#ffffff', 
                  bg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
                  border: 'transparent',
                  icon: TrendingUp, 
                  iconBg: 'rgba(255,255,255,0.2)',
                  gradient: true,
                  tab: 'wallet'
                },
              ].map(({ label, sub, value, color, bg, border, icon: Icon, iconBg, gradient, badge, tab }) => (
                <div 
                  key={label} 
                  onClick={() => setSearchParams({ tab })}
                  className="kpi-card" 
                  style={{ 
                    background: bg, 
                    border: `1px solid ${border}`,
                    borderRadius: '18px',
                    padding: '1.25rem 1.35rem',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.73rem', color: gradient ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {label}
                    </span>
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: iconBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: gradient ? '#ffffff' : color,
                      flexShrink: 0
                    }}>
                      <Icon size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 900, color, fontFamily: 'Outfit', lineHeight: 1.1, marginTop: '0.45rem' }}>
                    {value}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                    <span style={{ fontSize: '0.75rem', color: gradient ? 'rgba(255,255,255,0.72)' : 'var(--text-muted)', fontWeight: 500 }}>
                      {sub}
                    </span>
                    {badge && (
                      <span style={{ fontSize: '0.68rem', padding: '0.12rem 0.5rem', borderRadius: '999px', background: '#d97706', color: '#fff', fontWeight: 800 }}>
                        {badge}
                      </span>
                    )}
                  </div>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1,2,3].map(i => (
                  <div key={i} className="skeleton-shimmer" style={{ height: '78px', borderRadius: '14px' }} />
                ))}
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
                        {appointments.length > 0 ? appointments.map(app => {
                          const clientName = app.user_id?.name || app.client_name || 'Client';
                          const clientAvatar = app.user_id?.avatar;
                          const clientInitials = clientName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
                          const matric = app.user_id?.matricNo;
                          const serviceName = app.service_id?.name || 'Specialty Session';
                          const servicePrice = app.service_id?.price || 0;
                          const locationText = app.service_id?.location || 'Campus Studio / Main Salon';

                          return (
                            <div key={app.id || app._id} className={`expert-appt-card status-${app.status || 'pending'}`}>
                              {/* Top Row: Client Info & Status Badge */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.65rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                  {/* Client Avatar */}
                                  <div 
                                    onClick={() => clientAvatar && openLightbox(clientAvatar, clientName, 'Client Profile Photo')}
                                    style={{ 
                                      width: 44, 
                                      height: 44, 
                                      borderRadius: '12px', 
                                      background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      color: 'var(--primary)', 
                                      fontWeight: 800,
                                      fontSize: '0.95rem',
                                      flexShrink: 0,
                                      overflow: 'hidden',
                                      cursor: clientAvatar ? 'zoom-in' : 'default',
                                      border: '1.5px solid var(--border-light)'
                                    }}
                                  >
                                    {clientAvatar ? (
                                      <img src={clientAvatar} alt={clientName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <span>{clientInitials || <User size={20} />}</span>
                                    )}
                                  </div>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                      <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.98rem', fontFamily: 'Outfit' }}>
                                        {clientName}
                                      </span>
                                      {matric && (
                                        <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.02em' }}>
                                          {matric}
                                        </span>
                                      )}
                                    </div>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.15rem' }}>
                                      {serviceName} · <strong style={{ color: 'var(--text-main)' }}>₦{servicePrice.toLocaleString()}</strong>
                                    </span>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <span style={{ padding: '0.3rem 0.85rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'capitalize', background: statusBg(app.status), color: statusColor(app.status), border: `1px solid ${statusColor(app.status)}30` }}>
                                    ● {app.status}
                                  </span>
                                </div>
                              </div>

                              {/* Details: Date, Time, Location & Payment Tag */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem', background: 'var(--bg-main)', padding: '0.55rem 0.85rem', borderRadius: '10px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                  <Clock size={13} color="var(--primary)" /> {app.date} at {app.time}
                                </span>
                                <span>·</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <MapPin size={13} color="var(--text-muted)" /> {locationText}
                                </span>
                                <span style={{ marginLeft: 'auto' }}>
                                  {app.paymentStatus === 'paid' ? (
                                    <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', background: 'rgba(16,185,129,0.12)', color: '#059669', fontWeight: 800, border: '1px solid rgba(16,185,129,0.25)' }}>
                                      ✓ PAID (₦{servicePrice.toLocaleString()})
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', background: 'rgba(245,158,11,0.12)', color: '#d97706', fontWeight: 800, border: '1px solid rgba(245,158,11,0.25)' }}>
                                      ⏳ UNPAID
                                    </span>
                                  )}
                                </span>
                              </div>

                              {/* Notes if provided */}
                              {app.notes && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '0.85rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--border-light)' }}>
                                  "{app.notes}"
                                </div>
                              )}

                              {/* Actions Bar */}
                              <div className="appt-actions" style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button 
                                  onClick={() => setChatAppointment(app)} 
                                  style={{ padding: '0.42rem 0.8rem', fontSize: '0.78rem', color: 'var(--primary)', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
                                >
                                  <MessageSquare size={13} /> Chat with Client
                                </button>
                                <a 
                                  href={getGoogleCalendarUrl(app)} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.42rem 0.75rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none', minHeight: '34px', borderRadius: '10px' }}
                                >
                                  <Calendar size={13} color="var(--primary)" /> Cal
                                </a>
                                <button 
                                  onClick={() => downloadIcsFile(app)} 
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.42rem 0.75rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', minHeight: '34px', borderRadius: '10px' }}
                                >
                                  <Download size={13} color="var(--secondary)" /> .ics
                                </button>

                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                  {app.status !== 'approved' && app.status !== 'completed' && app.status !== 'cancelled' && (
                                    <button 
                                      onClick={() => handleUpdateStatus(app.id || app._id, 'approved')} 
                                      className="btn btn-secondary" 
                                      style={{ padding: '0.42rem 0.85rem', fontSize: '0.78rem', color: '#059669', minHeight: '34px', borderRadius: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                    >
                                      <CheckCircle size={14} /> Accept
                                    </button>
                                  )}
                                  {app.status === 'approved' && (
                                    <button 
                                      onClick={() => handleUpdateStatus(app.id || app._id, 'completed')} 
                                      className="btn btn-primary" 
                                      style={{ padding: '0.42rem 0.95rem', fontSize: '0.78rem', minHeight: '34px', borderRadius: '10px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                    >
                                      <CheckCircle size={14} /> Mark Completed
                                    </button>
                                  )}
                                  {app.status !== 'cancelled' && app.status !== 'completed' && (
                                    <button 
                                      onClick={() => handleUpdateStatus(app.id || app._id, 'cancelled')} 
                                      className="btn btn-secondary" 
                                      style={{ padding: '0.42rem 0.65rem', fontSize: '0.78rem', color: '#ef4444', minHeight: '34px', borderRadius: '10px' }} 
                                      title="Cancel Appointment"
                                    >
                                      <XCircle size={14} />
                                    </button>
                                  )}
                                  <button 
                                    type="button"
                                    onClick={() => handleDeleteAppointment(app.id || app._id)} 
                                    className="btn btn-outline" 
                                    style={{ padding: '0.42rem 0.65rem', fontSize: '0.78rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.25)', minHeight: '34px', borderRadius: '10px' }}
                                    title="Delete Record"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        }) : (
                          <div style={{ padding: '4.5rem 2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-main)', borderRadius: '16px', border: '1px dashed var(--border-light)' }}>
                            <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(99,102,241,0.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '1rem' }}>
                              <CalendarRange size={28} />
                            </div>
                            <h4 style={{ margin: '0 0 0.4rem', fontWeight: 800, color: 'var(--text-main)', fontSize: '1.05rem', fontFamily: 'Outfit' }}>
                              No Appointments in Queue
                            </h4>
                            <p style={{ fontSize: '0.85rem', margin: '0 auto 1.25rem', maxWidth: '380px', lineHeight: 1.5 }}>
                              Client bookings will appear here in real time. Share your professional link to start getting booked!
                            </p>
                            <button
                              type="button"
                              onClick={() => setSearchParams({ tab: 'professional' })}
                              className="btn btn-secondary"
                              style={{ padding: '0.55rem 1.2rem', fontSize: '0.82rem', fontWeight: 700, borderRadius: '10px' }}
                            >
                              <Sparkles size={14} color="var(--primary)" /> View My Professional Page
                            </button>
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

                  {/* ─── PROFESSIONAL PAGE & LOOKBOOK ─── */}
                  {(activeTab === 'professional' || activeTab === 'lookbook') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

                      {/* 1. Public Profile Preview Banner */}
                      <div className="bento-card" style={{
                        padding: '1.75rem',
                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(99, 102, 241, 0.08), rgba(2, 132, 199, 0.05))',
                        border: '1px solid rgba(168, 85, 247, 0.25)',
                        borderRadius: '20px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                            <div 
                              onClick={() => user?.avatar && openLightbox(user.avatar, user?.name, 'Specialist Profile Photo')}
                              style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '18px',
                                background: 'linear-gradient(135deg, var(--secondary), var(--primary))',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.6rem',
                                fontWeight: 800,
                                fontFamily: 'Outfit',
                                flexShrink: 0,
                                overflow: 'hidden',
                                border: '2.5px solid #fff',
                                boxShadow: '0 8px 22px rgba(168, 85, 247, 0.28)',
                                cursor: user?.avatar ? 'zoom-in' : 'default'
                              }}
                              title={user?.avatar ? "Tap to view in full HD" : user?.name}
                            >
                              {user?.avatar ? (
                                <img src={user.avatar} alt={user?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                initials
                              )}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.35rem', fontFamily: 'Outfit', fontWeight: 800 }}>
                                  {user?.name || 'Expert Specialist'}
                                </h2>
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '9999px',
                                  background: user?.isActivated ? '#dcfce7' : '#fef3c7',
                                  color: user?.isActivated ? '#15803d' : '#d97706',
                                  border: `1px solid ${user?.isActivated ? '#bbf7d0' : '#fde68a'}`,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}>
                                  <Shield size={12} /> {user?.isActivated ? 'Verified & Activated' : 'Pending Activation'}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 700 }}>
                                {user?.specialty || 'Campus Styling Specialist'}
                              </p>
                              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                This is your live profile customers see on D.WORLD before booking an appointment.
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => navigate(`/expert/${user?.id || user?._id}`)}
                            className="btn btn-primary"
                            style={{ padding: '0.7rem 1.35rem', fontSize: '0.875rem', fontWeight: 700, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}
                          >
                            <ExternalLink size={16} /> View Live Public Page
                          </button>
                        </div>
                      </div>

                      {/* 2. Campus Address & Location Setting */}
                      <div className="app-card">
                        <div className="card-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <MapPin size={18} />
                            </div>
                            <div>
                              <h3 style={{ margin: 0 }}>Specialist Physical Campus Address</h3>
                              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Exact campus location or salon room where customers meet you for styling
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="card-body">
                          <form onSubmit={submitProfile} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <input
                                type="text"
                                placeholder="e.g. Lead City University Campus, Hostel A, Room 12 / Salon Suite 3"
                                value={profileForm.address}
                                onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                                style={{ flex: 1, minWidth: '240px', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border-light)', fontSize: '0.875rem', background: 'var(--bg-input, var(--bg-card))' }}
                              />
                              <button
                                type="submit"
                                disabled={savingProfile}
                                className="btn btn-primary"
                                style={{ padding: '0.75rem 1.35rem', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0 }}
                              >
                                {savingProfile ? 'Saving...' : 'Save Address'}
                              </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ecfdf5', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                              <MapPin size={14} color="#059669" />
                              <span style={{ fontSize: '0.78rem', color: '#065f46', fontWeight: 600 }}>
                                Current Address: <strong>{profileForm.address || user?.address || user?.location || 'Lead City University Campus, Ibadan'}</strong>
                              </span>
                            </div>
                          </form>
                        </div>
                      </div>

                      {/* 3. Services Offered During Registration */}
                      <div className="app-card">
                        <div className="card-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(79, 70, 229, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Briefcase size={18} />
                            </div>
                            <div>
                              <h3 style={{ margin: 0 }}>Services Offered On Your Page</h3>
                              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Services registered during onboarding and available for student bookings
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSearchParams({ tab: 'services' })}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem', borderRadius: '8px' }}
                          >
                            + Manage Services
                          </button>
                        </div>

                        <div className="card-body">
                          {services.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.85rem' }}>
                              {services.map(srv => (
                                <div
                                  key={srv._id || srv.id}
                                  style={{
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid var(--border-light)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.4rem'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>
                                      {srv.name}
                                    </strong>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--secondary)' }}>
                                      ₦{Number(srv.price || 0).toLocaleString()}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    <span>{srv.category || 'Specialist Service'}</span>
                                    <span>•</span>
                                    <span>{srv.duration || 45} mins</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                              <Briefcase size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                              <p style={{ margin: 0, fontWeight: 600 }}>No services listed yet</p>
                              <button
                                type="button"
                                onClick={() => setSearchParams({ tab: 'services' })}
                                className="btn btn-primary"
                                style={{ marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.45rem 1rem' }}
                              >
                                Add Your First Service
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 4. Professional Lookbook (Max 3 Pictures) */}
                      <div className="app-card">
                        <div className="card-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(168, 85, 247, 0.12)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Images size={18} />
                            </div>
                            <div>
                              <h3 style={{ margin: 0 }}>Lookbook Showcase Works (Max 3 Pictures)</h3>
                              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                High-res photos of your hairstyles and finished client appointments
                              </p>
                            </div>
                          </div>

                          <span style={{
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            padding: '0.3rem 0.75rem',
                            borderRadius: '9999px',
                            background: portfolio.length >= 3 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                            color: portfolio.length >= 3 ? '#ef4444' : 'var(--secondary)',
                            border: `1px solid ${portfolio.length >= 3 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(168, 85, 247, 0.25)'}`
                          }}>
                            {portfolio.length} / 3 Works Uploaded
                          </span>
                        </div>

                        <div className="card-body">
                          {/* File input for Cloudinary */}
                          <input
                            type="file"
                            ref={lookbookFileInputRef}
                            accept="image/*"
                            onChange={handleLookbookFileSelect}
                            style={{ display: 'none' }}
                          />

                          {portfolio.length >= 3 ? (
                            /* Showcase is Full Banner */
                            <div style={{
                              padding: '1.25rem',
                              borderRadius: '14px',
                              background: 'rgba(16, 185, 129, 0.08)',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.85rem',
                              marginBottom: '1.25rem'
                            }}>
                              <CheckCircle size={22} color="#10b981" style={{ flexShrink: 0 }} />
                              <div>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'block' }}>
                                  Lookbook Showcase Full (3 / 3 Photos)
                                </strong>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  Your professional page is fully equipped with 3 showcase works. To replace or add a new photo, please delete one of your existing works below.
                                </p>
                              </div>
                            </div>
                          ) : (
                            /* Upload Form */
                            <form onSubmit={handleAddPortfolioItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                              {!portfolioPreview ? (
                                <div
                                  onClick={() => lookbookFileInputRef.current && lookbookFileInputRef.current.click()}
                                  style={{
                                    border: '2px dashed rgba(168, 85, 247, 0.4)',
                                    borderRadius: '16px',
                                    padding: '2rem 1.5rem',
                                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.04), rgba(99, 102, 241, 0.04))',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.65rem'
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = 'var(--secondary)';
                                    e.currentTarget.style.background = 'rgba(168, 85, 247, 0.08)';
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)';
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(168, 85, 247, 0.04), rgba(99, 102, 241, 0.04))';
                                  }}
                                >
                                  <div style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '16px',
                                    background: 'linear-gradient(135deg, var(--secondary), var(--primary))',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 6px 16px rgba(168, 85, 247, 0.3)'
                                  }}>
                                    <Camera size={26} />
                                  </div>
                                  <div>
                                    <strong style={{ fontSize: '1rem', color: 'var(--text-main)', display: 'block', fontFamily: 'Outfit' }}>
                                      Choose from Photo Library or Files
                                    </strong>
                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                      Tap to pick a high-res photo from your phone/computer gallery to upload directly via Cloudinary
                                    </p>
                                  </div>
                                  <span style={{
                                    marginTop: '0.25rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    padding: '0.35rem 0.85rem',
                                    borderRadius: '20px',
                                    background: 'rgba(168, 85, 247, 0.15)',
                                    color: 'var(--secondary)'
                                  }}>
                                    ☁️ Cloudinary Auto-Storage • Slot {portfolio.length + 1} of 3
                                  </span>
                                </div>
                              ) : (
                                <div style={{
                                  borderRadius: '16px',
                                  overflow: 'hidden',
                                  border: '1px solid rgba(168, 85, 247, 0.35)',
                                  background: 'rgba(168, 85, 247, 0.04)',
                                  padding: '1rem',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '0.85rem'
                                }}>
                                  <div 
                                    onClick={() => openLightbox(portfolioPreview, portfolioForm.title || 'Selected Photo Preview', 'Tap to view full resolution')}
                                    style={{
                                      position: 'relative',
                                      borderRadius: '12px',
                                      overflow: 'hidden',
                                      maxWidth: '100%',
                                      maxHeight: '260px',
                                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                      cursor: 'zoom-in'
                                    }}
                                  >
                                    <img
                                      src={portfolioPreview}
                                      alt="Selected lookbook preview"
                                      style={{ maxWidth: '100%', maxHeight: '260px', objectFit: 'contain', display: 'block' }}
                                    />
                                    <span style={{
                                      position: 'absolute',
                                      bottom: '0.5rem',
                                      right: '0.5rem',
                                      background: 'rgba(0,0,0,0.65)',
                                      color: '#fff',
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      padding: '0.25rem 0.6rem',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.3rem'
                                    }}>
                                      <ZoomIn size={12} /> Tap to zoom
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', justifyContent: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={() => lookbookFileInputRef.current && lookbookFileInputRef.current.click()}
                                      className="btn btn-secondary"
                                      style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem' }}
                                    >
                                      Change Photo
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPortfolioForm(prev => ({ ...prev, imageUrl: '' }));
                                        setPortfolioPreview(null);
                                      }}
                                      className="btn btn-outline"
                                      style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Title (optional)</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Ghana Braids, Knotless Braids, Skin Fade"
                                  value={portfolioForm.title}
                                  onChange={e => setPortfolioForm({ ...portfolioForm, title: e.target.value })}
                                />
                              </div>

                              <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Caption / Description (optional)</label>
                                <input
                                  type="text"
                                  placeholder="Describe this style, technique used, products, etc."
                                  value={portfolioForm.description}
                                  onChange={e => setPortfolioForm({ ...portfolioForm, description: e.target.value })}
                                />
                              </div>

                              <button
                                type="submit"
                                disabled={portfolioSubmitting || !portfolioForm.imageUrl.trim()}
                                className="btn btn-primary"
                                style={{ alignSelf: 'flex-start', background: 'linear-gradient(135deg, var(--secondary), var(--primary))', borderColor: 'transparent', padding: '0.65rem 1.5rem' }}
                              >
                                {portfolioSubmitting ? 'Uploading to Cloudinary...' : <><Images size={15} /> Upload to Lookbook</>}
                              </button>
                            </form>
                          )}

                          {/* 3-Photo Showcase Grid */}
                          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.85rem' }}>
                              YOUR 3 HIGHLIGHT WORKS ON PROFESSIONAL PAGE
                            </span>

                            {portfolio.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px dashed var(--border-light)' }}>
                                <ImageOff size={36} style={{ opacity: 0.25, marginBottom: '0.5rem' }} />
                                <p style={{ fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>No lookbook works uploaded yet</p>
                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  Upload your top 3 pictures above so students can admire your work and book.
                                </p>
                              </div>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                {portfolio.slice(0, 3).map((item, idx) => (
                                  <div
                                    key={String(item._id || idx)}
                                    style={{
                                      borderRadius: '16px',
                                      overflow: 'hidden',
                                      background: 'var(--bg-card)',
                                      border: '1px solid var(--border-light)',
                                      boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                                      transition: 'transform 0.18s ease'
                                    }}
                                  >
                                    <div
                                      onClick={() => openLightbox(item.imageUrl, item.title || `Work Sample #${idx + 1}`, `${item.category} • Style Photo`)}
                                      style={{ position: 'relative', height: '200px', background: 'rgba(168,85,247,0.06)', cursor: 'zoom-in' }}
                                    >
                                      <img
                                        src={item.imageUrl}
                                        alt={item.title || 'Lookbook'}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                      />
                                      <span style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '0.62rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '6px', backdropFilter: 'blur(4px)', textTransform: 'uppercase' }}>
                                        {item.category}
                                      </span>
                                      <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.35rem' }}>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenEditPortfolio(item);
                                          }}
                                          title="Edit photo details or swap picture"
                                          style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
                                        >
                                          <Edit size={13} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeletePortfolioItem(String(item._id));
                                          }}
                                          title="Delete photo"
                                          style={{ background: 'rgba(239,68,68,0.88)', border: 'none', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                      <span style={{ position: 'absolute', bottom: '0.4rem', right: '0.5rem', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <ZoomIn size={11} /> Zoom
                                      </span>
                                    </div>
                                    <div style={{ padding: '0.75rem 0.85rem' }}>
                                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)', display: 'block', fontFamily: 'Outfit' }}>
                                        {item.title || `Work #${idx + 1}`}
                                      </strong>
                                      {item.description && (
                                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                          {item.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* ─── PROFILE ─── */}
                  {activeTab === 'profile' && (
                    <div className="app-card" style={{ maxWidth: '620px' }}>
                      <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(99,102,241,0.25))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: 'var(--secondary)' }}>{initials}</div>
                          <div>
                            <h3 style={{ margin: 0 }}>Specialist Profile Settings</h3>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user?.email} • {user?.specialty || 'General Specialist'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="card-body">
                        {/* SPECIALIST AVATAR UPLOADER */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1.5rem',
                          padding: '1.25rem',
                          borderRadius: '18px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-light)',
                          marginBottom: '1.5rem'
                        }}>
                          {/* Circular Avatar */}
                          <div style={{ position: 'relative' }}>
                            <div 
                              onClick={() => {
                                if (user?.avatar) {
                                  openLightbox(user.avatar, user?.name, 'Specialist Profile Photo • Full HD View');
                                } else if (avatarInputRef.current) {
                                  avatarInputRef.current.click();
                                }
                              }}
                              style={{
                                width: '92px',
                                height: '92px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--secondary), var(--primary))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: '2rem',
                                fontWeight: 800,
                                overflow: 'hidden',
                                cursor: user?.avatar ? 'zoom-in' : 'pointer',
                                boxShadow: '0 8px 24px rgba(168, 85, 247, 0.25)',
                                border: '3px solid rgba(255, 255, 255, 0.15)',
                                position: 'relative'
                              }}
                              title={user?.avatar ? "Click to view full photo in lightbox" : "Click to upload avatar"}
                            >
                              {user?.avatar ? (
                                <img 
                                  src={user.avatar} 
                                  alt={user?.name} 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                              ) : (
                                initials
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => avatarInputRef.current && avatarInputRef.current.click()}
                              disabled={avatarUploading}
                              title="Upload Specialist Photo"
                              style={{
                                position: 'absolute',
                                bottom: '-2px',
                                right: '-2px',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'var(--secondary)',
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

                          {/* Controls */}
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontFamily: 'Outfit', fontWeight: 700 }}>
                              Specialist Avatar
                            </h4>
                            <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              Students and clients see this photo across the campus discovery feed and booking wizard.
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
                                {avatarUploading ? 'Uploading...' : 'Change Photo'}
                              </button>

                              {user?.avatar && (
                                <button
                                  type="button"
                                  onClick={() => openLightbox(user.avatar, user?.name, 'Specialist Profile Photo • Full HD View')}
                                  className="btn btn-outline"
                                  style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                >
                                  <ZoomIn size={14} /> Full View
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <form onSubmit={submitProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>Display Name</label>
                            <input type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} required />
                          </div>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>Contact Phone</label>
                            <input type="text" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} />
                          </div>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>Specialist Campus Address / Room</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Lead City University Campus, Hostel A, Room 12"
                              value={profileForm.address} 
                              onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} 
                            />
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
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Location</label>
                  <input type="text" name="location" value={serviceForm.location} onChange={e => setServiceForm({ ...serviceForm, [e.target.name]: e.target.value })} />
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

      {/* ── Edit Lookbook Photo Modal ── */}
      <AnimatePresence>
        {editPortfolioModal.isOpen && (
          <div className="modal-overlay" onClick={() => !editPortfolioModal.submitting && setEditPortfolioModal(prev => ({ ...prev, isOpen: false }))}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
              className="modal-card"
              style={{ maxWidth: '520px', width: '100%', padding: '1.75rem', borderRadius: '20px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(168,85,247,0.12)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Edit size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontFamily: 'Outfit', fontWeight: 800 }}>Edit Lookbook Photo</h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Update title, caption, or swap picture</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !editPortfolioModal.submitting && setEditPortfolioModal(prev => ({ ...prev, isOpen: false }))}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveEditPortfolio} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                {/* Photo Preview & Change action */}
                <div style={{
                  position: 'relative',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: '#090d16',
                  border: '1px solid var(--border-light)',
                  maxHeight: '220px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img
                    src={editPortfolioModal.previewUrl || editPortfolioModal.imageUrl}
                    alt="Lookbook work preview"
                    style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'contain', display: 'block' }}
                  />
                  <input
                    type="file"
                    ref={editPortfolioFileRef}
                    accept="image/*"
                    onChange={handleEditPortfolioFile}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => editPortfolioFileRef.current?.click()}
                    style={{
                      position: 'absolute',
                      bottom: '0.75rem',
                      right: '0.75rem',
                      background: 'rgba(0,0,0,0.75)',
                      backdropFilter: 'blur(8px)',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.25)',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Camera size={13} /> Change Photo
                  </button>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem', display: 'block' }}>
                    Title (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ghana Braids, Skin Fade, Acrylic Full Set"
                    value={editPortfolioModal.title}
                    onChange={e => setEditPortfolioModal(prev => ({ ...prev, title: e.target.value }))}
                    style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '10px', border: '1px solid var(--border-light)', fontSize: '0.875rem' }}
                  />
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem', display: 'block' }}>
                    Caption / Description (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Describe technique, styling details, products used..."
                    value={editPortfolioModal.description}
                    onChange={e => setEditPortfolioModal(prev => ({ ...prev, description: e.target.value }))}
                    style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '10px', border: '1px solid var(--border-light)', fontSize: '0.875rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    disabled={editPortfolioModal.submitting}
                    onClick={() => setEditPortfolioModal(prev => ({ ...prev, isOpen: false }))}
                    className="btn btn-secondary"
                    style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editPortfolioModal.submitting}
                    className="btn btn-primary"
                    style={{ padding: '0.65rem 1.5rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--secondary), var(--primary))', borderColor: 'transparent' }}
                  >
                    {editPortfolioModal.submitting ? 'Saving to Cloudinary...' : 'Save Changes'}
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
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Smooth Image Lightbox Modal */}
      <ImageLightboxModal
        isOpen={lightbox.isOpen}
        imageUrl={lightbox.imageUrl}
        title={lightbox.title}
        subtitle={lightbox.subtitle}
        onClose={() => setLightbox(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
};

export default ExpertDashboard;
