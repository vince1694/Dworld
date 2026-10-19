import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarClock,
  CalendarX2,
  CalendarCheck2,
  Clock,
  User,
  MessageSquare,
  RotateCcw,
  Trash2,
  CreditCard,
  Star,
  ChevronRight,
  Search,
  LayoutGrid,
  List,
  Sparkles,
  CheckCircle2,
  XCircle,
  Hourglass,
  CircleCheck,
  BadgeCheck,
  Banknote,
  CalendarPlus,
  X,
  MapPin,
  Phone,
  Eye,
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────── */
const STATUS_META = {
  pending: {
    label: 'Pending',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.25)',
    icon: <Hourglass size={14} />,
    gradStart: '#f59e0b',
    gradEnd: '#fbbf24',
  },
  approved: {
    label: 'Approved',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.1)',
    border: 'rgba(99,102,241,0.25)',
    icon: <BadgeCheck size={14} />,
    gradStart: '#6366f1',
    gradEnd: '#8b5cf6',
  },
  completed: {
    label: 'Completed',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.25)',
    icon: <CircleCheck size={14} />,
    gradStart: '#10b981',
    gradEnd: '#34d399',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
    icon: <XCircle size={14} />,
    gradStart: '#ef4444',
    gradEnd: '#f87171',
  },
};

const getDaysUntil = (dateStr) => {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const apptDate = new Date(dateStr);
  apptDate.setHours(0, 0, 0, 0);
  const diff = Math.round((apptDate - today) / (1000 * 60 * 60 * 24));
  return diff;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' });
};

const CountdownChip = ({ dateStr, status }) => {
  if (status === 'completed' || status === 'cancelled') return null;
  const days = getDaysUntil(dateStr);
  if (days === null) return null;

  let label, bg, color;
  if (days < 0) {
    label = 'Past due';
    bg = 'rgba(239,68,68,0.1)';
    color = '#ef4444';
  } else if (days === 0) {
    label = 'Today!';
    bg = 'rgba(16,185,129,0.12)';
    color = '#10b981';
  } else if (days === 1) {
    label = 'Tomorrow';
    bg = 'rgba(99,102,241,0.1)';
    color = '#6366f1';
  } else if (days <= 7) {
    label = `In ${days} days`;
    bg = 'rgba(99,102,241,0.08)';
    color = '#6366f1';
  } else {
    label = `In ${days}d`;
    bg = 'rgba(100,116,139,0.08)';
    color = '#64748b';
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.2rem 0.55rem', borderRadius: '999px',
      background: bg, color, fontSize: '0.7rem', fontWeight: 700,
    }}>
      <Clock size={10} /> {label}
    </span>
  );
};

const SpecialistAvatar = ({ appointment, size = 40 }) => {
  const stylist = appointment.service_id?.stylist_id || appointment.stylist_id;
  const name = stylist?.name || 'S';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const avatar = stylist?.avatar;

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatar ? 'transparent' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontWeight: 800, fontSize: size * 0.35,
      fontFamily: 'Outfit, sans-serif', flexShrink: 0, overflow: 'hidden',
      border: '2px solid rgba(99,102,241,0.2)',
    }}>
      {avatar
        ? <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials
      }
    </div>
  );
};

/* ─── Card Component ──────────────────────────────────── */
const AppointmentCard = ({ app, onOpen, onChat, onReschedule, onDelete, onPay, onReview }) => {
  const meta = STATUS_META[app.status] || STATUS_META.pending;
  const stylist = app.service_id?.stylist_id || app.stylist_id;
  const specialistName = stylist?.name || 'Specialist';
  const serviceName = app.service_id?.name || 'Beauty Service';
  const price = app.service_id?.price || 0;
  const duration = app.service_id?.duration || 45;
  const isPaid = app.paymentStatus === 'paid';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onOpen(app)}
      style={{
        background: '#ffffff',
        border: `1px solid ${meta.border}`,
        borderRadius: '18px',
        padding: '1.2rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
        position: 'relative',
        overflow: 'hidden',
      }}
      whileHover={{ y: -2, boxShadow: '0 8px 28px rgba(15,23,42,0.1)', borderColor: meta.color }}
    >
      {/* status glow bar top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: `linear-gradient(90deg, ${meta.gradStart}, ${meta.gradEnd})`,
        borderRadius: '18px 18px 0 0',
      }} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '0.85rem' }}>
        <SpecialistAvatar appointment={app} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: '0.97rem', color: '#0f172a',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {serviceName}
            </span>
            {/* Status badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.22rem 0.6rem', borderRadius: '999px',
              background: meta.bg, color: meta.color,
              fontSize: '0.72rem', fontWeight: 700,
              border: `1px solid ${meta.border}`,
            }}>
              {meta.icon} {meta.label}
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.18rem' }}>
            <User size={11} /> {specialistName}
          </span>
        </div>
      </div>

      {/* Info row */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
        padding: '0.7rem 0.85rem',
        background: '#f8fafc', borderRadius: '12px',
        marginBottom: '0.85rem',
      }}>
        <InfoChip icon={<CalendarClock size={13} />} text={`${formatDate(app.date)} · ${app.time || '—'}`} />
        <InfoChip icon={<Clock size={13} />} text={`${duration} min`} />
        <InfoChip icon={<Banknote size={13} />} text={`₦${Number(price).toLocaleString()}`} color={isPaid ? '#10b981' : undefined} />
        {isPaid && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            padding: '0.2rem 0.5rem', borderRadius: '999px',
            background: 'rgba(16,185,129,0.1)', color: '#10b981',
            fontSize: '0.68rem', fontWeight: 700,
          }}>
            <CheckCircle2 size={11} /> Paid
          </span>
        )}
        <CountdownChip dateStr={app.date} status={app.status} />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
        <QuickBtn
          icon={<MessageSquare size={13} />}
          label="Chat"
          color="#6366f1"
          bg="rgba(99,102,241,0.09)"
          border="rgba(99,102,241,0.22)"
          onClick={() => onChat(app)}
        />
        {(app.status === 'pending' || app.status === 'approved') && (
          <QuickBtn
            icon={<RotateCcw size={13} />}
            label="Reschedule"
            color="#d97706"
            bg="rgba(245,158,11,0.09)"
            border="rgba(245,158,11,0.22)"
            onClick={() => onReschedule(app)}
          />
        )}
        {(app.status === 'approved' || app.status === 'completed') && !isPaid && (
          <QuickBtn
            icon={<CreditCard size={13} />}
            label={`Pay ₦${Number(price).toLocaleString()}`}
            color="#10b981"
            bg="rgba(16,185,129,0.1)"
            border="rgba(16,185,129,0.25)"
            onClick={() => onPay(app)}
          />
        )}
        {(app.status === 'completed' || app.status === 'cancelled') && (
          <QuickBtn
            icon={<Star size={13} />}
            label="Review"
            color="#f59e0b"
            bg="rgba(245,158,11,0.09)"
            border="rgba(245,158,11,0.22)"
            onClick={() => onReview(app)}
          />
        )}
        <QuickBtn
          icon={<Trash2 size={13} />}
          label="Delete"
          color="#ef4444"
          bg="rgba(239,68,68,0.07)"
          border="rgba(239,68,68,0.2)"
          onClick={() => onDelete(app)}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', color: '#94a3b8' }}>
          <Eye size={14} />
        </div>
      </div>
    </motion.div>
  );
};

const InfoChip = ({ icon, text, color }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
    fontSize: '0.76rem', fontWeight: 600,
    color: color || '#475569',
  }}>
    <span style={{ color: color || '#6366f1' }}>{icon}</span>
    {text}
  </span>
);

const QuickBtn = ({ icon, label, color, bg, border, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.35rem 0.7rem', borderRadius: '9px',
      background: bg, border: `1px solid ${border}`, color,
      fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer',
      minHeight: '32px', transition: 'all 0.15s ease',
    }}
    onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.92)'; }}
    onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
  >
    {icon} {label}
  </button>
);

/* ─── Timeline Row ────────────────────────────────────── */
const TimelineRow = ({ app, onOpen, onChat, onReschedule, onDelete, onPay, onReview }) => {
  const meta = STATUS_META[app.status] || STATUS_META.pending;
  const stylist = app.service_id?.stylist_id || app.stylist_id;
  const specialistName = stylist?.name || 'Specialist';
  const serviceName = app.service_id?.name || 'Beauty Service';
  const price = app.service_id?.price || 0;
  const isPaid = app.paymentStatus === 'paid';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      style={{ display: 'flex', alignItems: 'stretch', gap: '0', position: 'relative' }}
    >
      {/* Timeline dot + line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '1rem', flexShrink: 0 }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '50%',
          background: `linear-gradient(135deg, ${meta.gradStart}, ${meta.gradEnd})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', flexShrink: 0, boxShadow: `0 4px 12px ${meta.bg}`,
        }}>
          {meta.icon && React.cloneElement(meta.icon, { size: 16 })}
        </div>
        <div style={{ flex: 1, width: '2px', background: 'var(--border-light)', minHeight: '12px', marginTop: '4px' }} />
      </div>

      {/* Row card */}
      <div
        onClick={() => onOpen(app)}
        style={{
          flex: 1, background: '#fff', border: '1px solid var(--border-light)',
          borderRadius: '16px', padding: '1rem 1.1rem', marginBottom: '0.85rem',
          cursor: 'pointer', transition: 'all 0.18s ease',
          boxShadow: '0 1px 8px rgba(15,23,42,0.04)',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.boxShadow = `0 4px 16px rgba(15,23,42,0.08)`; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.boxShadow = '0 1px 8px rgba(15,23,42,0.04)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <SpecialistAvatar appointment={app} size={32} />
            <div>
              <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>{serviceName}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>with {specialistName}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <CountdownChip dateStr={app.date} status={app.status} />
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.22rem 0.6rem', borderRadius: '999px',
              background: meta.bg, color: meta.color, fontSize: '0.72rem', fontWeight: 700,
              border: `1px solid ${meta.border}`,
            }}>
              {meta.icon} {meta.label}
            </span>
            {isPaid && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                padding: '0.2rem 0.5rem', borderRadius: '999px',
                background: 'rgba(16,185,129,0.1)', color: '#10b981',
                fontSize: '0.68rem', fontWeight: 700,
              }}>
                <CheckCircle2 size={11} /> Paid
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <InfoChip icon={<CalendarClock size={12} />} text={`${formatDate(app.date)} · ${app.time || '—'}`} />
          <InfoChip icon={<Banknote size={12} />} text={`₦${Number(price).toLocaleString()}`} />
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.65rem', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
          <QuickBtn icon={<MessageSquare size={12} />} label="Chat" color="#6366f1" bg="rgba(99,102,241,0.08)" border="rgba(99,102,241,0.2)" onClick={() => onChat(app)} />
          {(app.status === 'pending' || app.status === 'approved') && (
            <QuickBtn icon={<RotateCcw size={12} />} label="Reschedule" color="#d97706" bg="rgba(245,158,11,0.08)" border="rgba(245,158,11,0.2)" onClick={() => onReschedule(app)} />
          )}
          {(app.status === 'approved' || app.status === 'completed') && !isPaid && (
            <QuickBtn icon={<CreditCard size={12} />} label={`Pay ₦${Number(price).toLocaleString()}`} color="#10b981" bg="rgba(16,185,129,0.1)" border="rgba(16,185,129,0.25)" onClick={() => onPay(app)} />
          )}
          {(app.status === 'completed' || app.status === 'cancelled') && (
            <QuickBtn icon={<Star size={12} />} label="Review" color="#f59e0b" bg="rgba(245,158,11,0.08)" border="rgba(245,158,11,0.2)" onClick={() => onReview(app)} />
          )}
          <QuickBtn icon={<Trash2 size={12} />} label="" color="#ef4444" bg="rgba(239,68,68,0.06)" border="rgba(239,68,68,0.18)" onClick={() => onDelete(app)} />
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Empty State ─────────────────────────────────────── */
const EmptyState = ({ filter, onBook }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '4rem 2rem', textAlign: 'center' }}
  >
    <div style={{
      width: 80, height: 80, borderRadius: '24px',
      background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 8px 24px rgba(99,102,241,0.1)',
    }}>
      <CalendarX2 size={36} style={{ color: '#6366f1' }} />
    </div>
    <div>
      <h3 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.15rem', color: '#0f172a', margin: '0 0 0.4rem' }}>
        {filter === 'all' ? 'No bookings yet' : `No ${filter} appointments`}
      </h3>
      <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0, maxWidth: 280 }}>
        {filter === 'all'
          ? 'Book your first session with a verified beauty specialist on D.WORLD.'
          : `You have no appointments with status "${filter}" right now.`}
      </p>
    </div>
    {filter === 'all' && (
      <button
        onClick={onBook}
        className="btn btn-primary"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.9rem' }}
      >
        <CalendarPlus size={16} /> Book a Session
      </button>
    )}
  </motion.div>
);

/* ─── Skeleton Loader ─────────────────────────────────── */
const SkeletonCard = () => (
  <div style={{ background: '#fff', borderRadius: '18px', border: '1px solid #e2e8f0', padding: '1.2rem', overflow: 'hidden' }}>
    <div style={{ display: 'flex', gap: '0.85rem', marginBottom: '0.85rem' }}>
      <div className="stat-shimmer" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        <div className="stat-shimmer" style={{ height: '1rem', width: '60%', borderRadius: 6 }} />
        <div className="stat-shimmer" style={{ height: '0.75rem', width: '40%', borderRadius: 6 }} />
      </div>
    </div>
    <div className="stat-shimmer" style={{ height: '52px', borderRadius: 12, marginBottom: '0.85rem' }} />
    <div style={{ display: 'flex', gap: '0.45rem' }}>
      {[70, 90, 80].map((w, i) => (
        <div key={i} className="stat-shimmer" style={{ height: 32, width: w, borderRadius: 9 }} />
      ))}
    </div>
  </div>
);

/* ─── STAT BANNER ─────────────────────────────────────── */
const StatBanner = ({ appointments, loading }) => {
  const stats = useMemo(() => {
    let pending = 0, approved = 0, completed = 0, cancelled = 0;
    for (const a of appointments) {
      if (a.status === 'pending') pending++;
      else if (a.status === 'approved') approved++;
      else if (a.status === 'completed') completed++;
      else if (a.status === 'cancelled') cancelled++;
    }
    const totalSpent = appointments
      .filter(a => a.paymentStatus === 'paid')
      .reduce((s, a) => s + (parseFloat(a.service_id?.price) || 0), 0);
    return { pending, approved, completed, cancelled, totalSpent, total: appointments.length };
  }, [appointments]);

  const items = [
    { label: 'Total', value: stats.total, icon: <CalendarClock size={18} />, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { label: 'Upcoming', value: stats.pending + stats.approved, icon: <Hourglass size={18} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Completed', value: stats.completed, icon: <CircleCheck size={18} />, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { label: 'Total Spent', value: `₦${stats.totalSpent.toLocaleString()}`, icon: <Banknote size={18} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', marginBottom: '1.5rem' }}>
      {items.map((item, i) => (
        <div key={i} style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px',
          padding: '1rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
          boxShadow: '0 1px 6px rgba(15,23,42,0.04)',
        }}>
          <div style={{ width: 40, height: 40, borderRadius: '12px', background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {item.icon}
          </div>
          <div>
            {loading
              ? <div className="stat-shimmer" style={{ height: '1.4rem', width: '3rem', borderRadius: 6 }} />
              : <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.25rem', color: '#0f172a', lineHeight: 1.1 }}>{item.value}</div>
            }
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
const MyAppointments = ({
  appointments = [],
  loading = false,
  onOpen,
  onChat,
  onReschedule,
  onDelete,
  onPay,
  onReview,
  onBook,
  onClearHistory,
}) => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'timeline'
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return appointments.filter(a => {
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      if (!q) return true;
      const svc = (a.service_id?.name || '').toLowerCase();
      const specialist = (a.service_id?.stylist_id?.name || a.stylist_id?.name || '').toLowerCase();
      const date = (a.date || '').toLowerCase();
      return svc.includes(q) || specialist.includes(q) || date.includes(q);
    });
  }, [appointments, filterStatus, searchQuery]);

  const hasHistory = appointments.some(a => a.status === 'completed' || a.status === 'cancelled');

  const FILTERS = ['all', 'pending', 'approved', 'completed', 'cancelled'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── Stat Banner ── */}
      <StatBanner appointments={appointments} loading={loading} />

      {/* ── Controls Bar ── */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px',
        padding: '0.85rem 1.1rem', marginBottom: '1.25rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
        boxShadow: '0 1px 6px rgba(15,23,42,0.04)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search service, specialist…"
            style={{
              width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem',
              borderRadius: '10px', border: '1.5px solid #e2e8f0',
              background: '#f8fafc', fontSize: '0.83rem', color: '#0f172a',
              outline: 'none', transition: 'border-color 0.2s',
              fontFamily: 'inherit',
            }}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', flexShrink: 0, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {FILTERS.map(f => {
            const m = STATUS_META[f];
            const isActive = filterStatus === f;
            return (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.38rem 0.7rem', borderRadius: '999px',
                  border: isActive ? `1.5px solid ${m?.color || '#6366f1'}` : '1px solid #e2e8f0',
                  background: isActive ? (m?.bg || 'rgba(99,102,241,0.1)') : '#f8fafc',
                  color: isActive ? (m?.color || '#6366f1') : '#64748b',
                  fontSize: '0.75rem', fontWeight: 700,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {f === 'all' ? <Sparkles size={12} /> : m?.icon && React.cloneElement(m.icon, { size: 12 })}
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            );
          })}
        </div>

        {/* View mode toggle */}
        <div style={{ display: 'flex', gap: '0.25rem', background: '#f1f5f9', borderRadius: '10px', padding: '3px', flexShrink: 0 }}>
          {[{ mode: 'grid', Icon: LayoutGrid }, { mode: 'timeline', Icon: List }].map(({ mode, Icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              title={mode.charAt(0).toUpperCase() + mode.slice(1)}
              style={{
                width: 32, height: 32, borderRadius: '8px', border: 'none',
                background: viewMode === mode ? '#ffffff' : 'transparent',
                color: viewMode === mode ? '#6366f1' : '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: viewMode === mode ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>

        {/* Clear History */}
        {hasHistory && (
          <button
            onClick={onClearHistory}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.38rem 0.7rem', borderRadius: '999px',
              border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)',
              color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Trash2 size={12} /> Clear History
          </button>
        )}

        {/* Book new */}
        <button
          onClick={onBook}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', padding: '0.45rem 0.85rem', minHeight: 36, flexShrink: 0 }}
        >
          <CalendarPlus size={14} /> New Booking
        </button>
      </div>

      {/* ── Count label ── */}
      {!loading && filtered.length > 0 && (
        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: '0.85rem', paddingLeft: '0.25rem' }}>
          Showing <span style={{ color: '#0f172a' }}>{filtered.length}</span> appointment{filtered.length !== 1 ? 's' : ''}
          {filterStatus !== 'all' ? ` · ${filterStatus}` : ''}
        </div>
      )}

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={viewMode === 'grid'
              ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }
              : { display: 'flex', flexDirection: 'column', gap: '0' }
            }
          >
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <EmptyState filter={filterStatus} onBook={onBook} />
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}
          >
            <AnimatePresence>
              {filtered.map(app => (
                <AppointmentCard
                  key={app._id || app.id}
                  app={app}
                  onOpen={onOpen}
                  onChat={onChat}
                  onReschedule={onReschedule}
                  onDelete={onDelete}
                  onPay={onPay}
                  onReview={onReview}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="timeline"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <AnimatePresence>
              {filtered.map(app => (
                <TimelineRow
                  key={app._id || app.id}
                  app={app}
                  onOpen={onOpen}
                  onChat={onChat}
                  onReschedule={onReschedule}
                  onDelete={onDelete}
                  onPay={onPay}
                  onReview={onReview}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyAppointments;
