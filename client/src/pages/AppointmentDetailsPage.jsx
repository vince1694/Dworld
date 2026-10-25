import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Calendar,
  Clock,
  ArrowLeft,
  MessageSquare,
  RotateCcw,
  Trash2,
  CreditCard,
  Star,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CalendarPlus,
  Download,
  Phone,
  MapPin,
  Share2,
  Copy,
  ChevronRight,
  User,
  Sparkles,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { API_URL } from '../config/api';
import { getGoogleCalendarUrl, downloadIcsFile } from '../utils/calendar';
import ReviewModal from '../components/ReviewModal';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending Confirmation',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
    icon: Clock,
    desc: 'Specialist has received your request and will confirm shortly.'
  },
  approved: {
    label: 'Confirmed & Scheduled',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.3)',
    icon: CheckCircle2,
    desc: 'Your appointment is locked in with the specialist.'
  },
  completed: {
    label: 'Session Completed',
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.1)',
    border: 'rgba(99, 102, 241, 0.3)',
    icon: CheckCircle2,
    desc: 'Service rendered. Review the specialist to help the campus community.'
  },
  cancelled: {
    label: 'Booking Cancelled',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)',
    icon: AlertCircle,
    desc: 'This booking has been cancelled and time slot released.'
  }
};

const AppointmentDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useNotify();

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Reschedule state
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  // Delete confirm state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_URL}/appointments/${id}`);
      if (res.data.success && res.data.data) {
        setAppointment(res.data.data);
      } else {
        setError('Appointment details could not be loaded.');
      }
    } catch (err) {
      console.error('Failed to load appointment:', err);
      setError(err.response?.data?.message || 'Appointment not found or you are not authorized to view it.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    notify.success('Link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handlePay = async () => {
    if (!appointment) return;
    try {
      setPaying(true);
      const res = await axios.post(`${API_URL}/appointments/${appointment._id}/pay`);
      if (res.data.success) {
        notify.success(res.data.message || 'Payment released successfully!');
        fetchAppointment();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Payment failed.';
      if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('wallet')) {
        notify.info('Redirecting to wallet to fund your account...');
        navigate('/wallet');
      } else {
        notify.error(msg);
      }
    } finally {
      setPaying(false);
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate || !newTime) {
      notify.error('Please pick both a new date and time');
      return;
    }

    try {
      setRescheduling(true);
      const res = await axios.patch(`${API_URL}/appointments/${appointment._id}/reschedule`, {
        date: newDate,
        time: newTime
      });
      if (res.data.success) {
        notify.success('Appointment rescheduled successfully!');
        setIsRescheduleOpen(false);
        fetchAppointment();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to reschedule appointment');
    } finally {
      setRescheduling(false);
    }
  };

  const handleDeleteBooking = async () => {
    try {
      setDeleting(true);
      const res = await axios.delete(`${API_URL}/appointments/${appointment._id}`);
      if (res.data.success) {
        notify.success(res.data.message || 'Booking removed successfully');
        navigate('/dashboard?tab=appointments');
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to delete booking');
    } finally {
      setDeleting(false);
      setIsDeleteConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper container animate-fade-in" style={{ padding: '2rem 1rem 4rem', maxWidth: '980px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <div style={{ width: 100, height: 24, borderRadius: 8, background: 'var(--border-light)', animation: 'pulse 1.5s infinite ease-in-out' }} />
        </div>
        <div style={{ width: '100%', height: 180, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border-light)', marginBottom: '1.5rem', animation: 'pulse 1.5s infinite ease-in-out' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div style={{ height: 260, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border-light)', animation: 'pulse 1.5s infinite ease-in-out' }} />
          <div style={{ height: 260, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border-light)', animation: 'pulse 1.5s infinite ease-in-out' }} />
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="page-wrapper container animate-fade-in" style={{ padding: '4rem 1rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <AlertCircle size={32} />
        </div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontFamily: 'Outfit' }}>Appointment Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{error || 'The appointment link may be broken or has been deleted.'}</p>
        <Link to="/dashboard?tab=appointments" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Return to Dashboard
        </Link>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusInfo.icon;
  const stylist = appointment.stylist_id || appointment.service_id?.stylist_id;
  const isPaid = appointment.paymentStatus === 'paid';
  const price = appointment.service_id?.price || appointment.amountPaid || 0;
  const serviceId = appointment.service_id?._id || appointment.service_id;

  return (
    <div className="page-wrapper container animate-fade-in" style={{ padding: '1.5rem 1rem 4rem', maxWidth: '1020px', margin: '0 auto' }}>
      
      {/* ── TOP BREADCRUMB / NAV BAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          onClick={() => navigate('/dashboard?tab=appointments')}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> Back to Appointments
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handleCopyLink}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem', fontSize: '0.82rem' }}
            title="Copy shareable link"
          >
            {copiedLink ? <CheckCircle2 size={15} color="#10b981" /> : <Copy size={15} />}
            <span>{copiedLink ? 'Copied' : 'Share Booking'}</span>
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', background: 'var(--surface)', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            Ref: #{appointment._id.slice(-6).toUpperCase()}
          </span>
        </div>
      </div>

      {/* ── HERO BANNER: STATUS & SERVICE HIGHLIGHT ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="appt-hero-banner"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.04) 100%)',
          borderRadius: '24px',
          border: '1px solid var(--border-light)',
          padding: '2rem',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: statusInfo.color,
                background: statusInfo.bg,
                border: `1px solid ${statusInfo.border}`
              }}>
                <StatusIcon size={14} />
                {statusInfo.label}
              </span>

              {isPaid ? (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#15803d',
                  background: '#dcfce7',
                  border: '1px solid #bbf7d0'
                }}>
                  <ShieldCheck size={14} /> Payment Released ✓
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#d97706',
                  background: '#fffbeb',
                  border: '1px solid #fde68a'
                }}>
                  Pending Payment
                </span>
              )}
            </div>

            <h1 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.3rem)', margin: '0 0 0.5rem', fontFamily: 'Outfit', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {appointment.service_id?.name || 'Campus Styling Appointment'}
            </h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '600px' }}>
              {statusInfo.desc}
            </p>
          </div>

          {/* Quick Schedule Capsule */}
          <div style={{
            background: 'var(--surface)',
            padding: '1.25rem 1.5rem',
            borderRadius: '18px',
            border: '1px solid var(--border-light)',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            minWidth: '220px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Calendar size={18} color="var(--primary)" />
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Date</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{appointment.date}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Clock size={18} color="var(--accent)" />
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Time Slot</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{appointment.time}</strong>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── MAIN CONTENT GRID: 2 COLUMNS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* LEFT COLUMN: SPECIALIST & LOCATION */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: 'var(--surface)',
            borderRadius: '20px',
            border: '1px solid var(--border-light)',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>
              Assigned Specialist
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
              {/* Avatar */}
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: '1.4rem',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {stylist?.avatar ? (
                  <img src={stylist.avatar} alt={stylist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (stylist?.name?.charAt(0) || 'S').toUpperCase()
                )}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>
                    {stylist?.name || 'D.World Specialist'}
                  </h3>
                  <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700 }}>
                    VERIFIED
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {stylist?.specialty || appointment.service_id?.category || 'Campus Stylist'}
                </div>
                {stylist?.matricNo && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-subtle)', marginTop: '0.15rem' }}>
                    Matric: {stylist.matricNo}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-main)', padding: '1rem', borderRadius: '14px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <MapPin size={16} color="var(--primary)" />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                {appointment.service_id?.location || stylist?.address || 'Campus Area Studio'}
              </div>
            </div>
            {stylist?.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Phone size={16} color="var(--primary)" />
                <a href={`tel:${stylist.phone}`} style={{ fontSize: '0.85rem', color: 'var(--text-main)', textDecoration: 'none' }}>
                  {stylist.phone}
                </a>
              </div>
            )}
          </div>

          {/* Special Notes from user */}
          {appointment.notes && (
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Client Specific Notes & Requests
              </span>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-main)', background: 'var(--bg-main)', padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                "{appointment.notes}"
              </p>
            </div>
          )}

          {/* Quick Direct Message Jump */}
          <Link
            to={`/chat?appointmentId=${appointment._id}`}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700 }}
          >
            <MessageSquare size={16} color="var(--primary)" />
            <span>Open Direct Chat Thread</span>
            <ChevronRight size={15} />
          </Link>
        </motion.div>

        {/* RIGHT COLUMN: FINANCIAL & CALENDAR SYNC */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            background: 'var(--surface)',
            borderRadius: '20px',
            border: '1px solid var(--border-light)',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}
        >
          {/* Payment & Escrow Status */}
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>
              Pricing & Escrow Protection
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Agreed Service Fee</span>
              <strong style={{ fontSize: '1.8rem', color: 'var(--secondary)', fontFamily: 'Outfit' }}>
                ₦{price.toLocaleString()}
              </strong>
            </div>

            <div style={{
              background: 'rgba(99, 102, 241, 0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <ShieldCheck size={24} color="var(--primary)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {isPaid
                  ? 'Payment has been settled. Funds are protected under D.WORLD Campus Buyer Guarantee.'
                  : 'Escrow Ready: Once approved, pay safely within the platform so your funds are released only upon completion.'}
              </div>
            </div>
          </div>

          {/* Calendar Sync Card */}
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <Calendar size={16} color="var(--primary)" />
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
                Sync to Device Calendar
              </strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(with 30m reminder)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <a
                href={getGoogleCalendarUrl(appointment)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  textDecoration: 'none',
                  borderRadius: '10px'
                }}
              >
                <Calendar size={14} color="var(--primary)" /> Google Calendar
              </a>
              <button
                type="button"
                onClick={() => downloadIcsFile(appointment)}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  borderRadius: '10px'
                }}
              >
                <Download size={14} color="var(--secondary)" /> Apple / Outlook (.ics)
              </button>
            </div>
          </div>

          {/* WhatsApp Direct Action if phone exists */}
          {stylist?.phone && (
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem' }}>
              <a
                href={`https://wa.me/${stylist.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello! I have a booking on D.WORLD for ${appointment.service_id?.name || 'styling'} on ${appointment.date} at ${appointment.time}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  background: 'rgba(34, 197, 94, 0.08)',
                  color: '#16a34a',
                  borderColor: 'rgba(34, 197, 94, 0.3)',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem'
                }}
              >
                💬 WhatsApp Stylist Directly
              </a>
            </div>
          )}
        </motion.div>

      </div>

      {/* ── ACTION BAR (FULL CONTROLS) ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="appt-action-bar"
        style={{
          background: 'var(--surface)',
          borderRadius: '20px',
          border: '1px solid var(--border-light)',
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Rebook Service */}
          {serviceId && (
            <Link
              to={`/book?serviceId=${serviceId}`}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
            >
              <CalendarPlus size={16} /> Rebook Service
            </Link>
          )}

          {/* Reschedule Date/Time (if pending or approved) */}
          {(appointment.status === 'pending' || appointment.status === 'approved') && (
            <button
              onClick={() => {
                setNewDate(appointment.date);
                setNewTime(appointment.time);
                setIsRescheduleOpen(true);
              }}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#d97706', borderColor: 'rgba(245, 158, 11, 0.3)' }}
            >
              <RotateCcw size={15} /> Reschedule Session
            </button>
          )}

          {/* Delete Booking */}
          <button
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
          >
            <Trash2 size={15} /> Delete Booking
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Pay Button if unpaid */}
          {!isPaid && (appointment.status === 'approved' || appointment.status === 'pending') && (
            <button
              disabled={paying}
              onClick={handlePay}
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                fontWeight: 800,
                padding: '0.75rem 1.4rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <CreditCard size={17} />
              <span>{paying ? 'Processing...' : `Pay Expert (₦${price.toLocaleString()})`}</span>
            </button>
          )}

          {/* Review Button if paid and completed */}
          {isPaid && (
            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="btn btn-secondary"
              style={{ border: '1px solid #f59e0b', color: '#d97706', background: '#fffbe8', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Star size={16} fill="#d97706" /> Leave Review
            </button>
          )}
        </div>
      </motion.div>

      {/* ── REVIEW MODAL ── */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        appointment={appointment}
        onReviewSubmitted={(msg) => {
          notify.success(msg);
          setIsReviewModalOpen(false);
          fetchAppointment();
        }}
      />

      {/* ── RESCHEDULE MODAL ── */}
      <AnimatePresence>
        {isRescheduleOpen && (
          <div className="modal-overlay" onClick={() => setIsRescheduleOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-card"
              style={{ maxWidth: '440px', padding: '1.75rem' }}
            >
              <h3 style={{ margin: '0 0 0.5rem', fontFamily: 'Outfit' }}>Reschedule Appointment</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Pick a new date and time slot for your appointment with {stylist?.name || 'the specialist'}.
              </p>

              <form onSubmit={handleRescheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    New Scheduled Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    New Time Slot
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10:00 AM"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setIsRescheduleOpen(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={rescheduling} className="btn btn-primary">
                    {rescheduling ? 'Saving...' : 'Confirm Reschedule'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="modal-overlay" onClick={() => setIsDeleteConfirmOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-card"
              style={{ maxWidth: '440px', padding: '1.75rem' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Trash2 size={22} />
              </div>
              <h3 style={{ margin: '0 0 0.5rem', fontFamily: 'Outfit' }}>Delete Booking?</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                Are you sure you want to delete this booking? If this appointment was already paid, any pending funds will be returned to your wallet.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button type="button" onClick={() => setIsDeleteConfirmOpen(false)} className="btn btn-secondary">
                  Keep Booking
                </button>
                <button type="button" disabled={deleting} onClick={handleDeleteBooking} className="btn btn-outline" style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                  {deleting ? 'Deleting...' : 'Delete Booking'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AppointmentDetailsPage;
