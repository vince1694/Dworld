import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import {
  Mail,
  Lock,
  User,
  AlertCircle,
  Phone,
  ShieldCheck,
  CheckCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  Briefcase,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Available single specialty services for experts
const EXPERT_SPECIALTIES = [
  { name: 'Nails', price: 2500, duration: 30, category: 'Nails', description: 'Classic nail care, shaping, and polish.' },
  { name: 'Lash Extensions', price: 4000, duration: 45, category: 'Lashes', description: 'Classic full set lash extensions.' },
  { name: 'Hair Braiding', price: 5000, duration: 90, category: 'Hair', description: 'Neat campus hair braiding and styling.' },
  { name: 'Wig Installation', price: 6000, duration: 60, category: 'Hair', description: 'Professional wig install and melt.' },
  { name: 'Frontal Installation', price: 7500, duration: 75, category: 'Hair', description: 'Custom frontal wig placement and styling.' },
  { name: 'Wig Revamping', price: 4500, duration: 60, category: 'Hair', description: 'Wig wash, deep conditioning, and restyling.' },
  { name: 'Hair Tinting', price: 4000, duration: 45, category: 'Hair', description: 'Vibrant hair color tinting and treatment.' },
  { name: 'Makeup', price: 5000, duration: 50, category: 'Makeup', description: 'Professional full face glam makeup.' },
  { name: 'Male Haircut / Barbering', price: 3000, duration: 30, category: 'Barbering', description: 'Precision male haircut and line-up.' },
  { name: 'Male Hair Braiding', price: 4500, duration: 60, category: 'Hair', description: 'Neat male cornrows and braided styles.' },
  { name: 'Hair Styling', price: 3500, duration: 45, category: 'Hair', description: 'Blowout, press, curling, and updos.' },
  { name: 'Hair Treatment', price: 3500, duration: 40, category: 'Hair', description: 'Deep scalp conditioning and moisture therapy.' },
  { name: 'Manicure', price: 2500, duration: 30, category: 'Nails', description: 'Nail trim, cuticle care, and hand massage.' },
  { name: 'Pedicure', price: 3500, duration: 45, category: 'Nails', description: 'Exfoliating foot soak, nail trim, and massage.' },
  { name: 'Facial', price: 5000, duration: 45, category: 'Skincare', description: 'Deep cleansing facial treatment and glow mask.' },
  { name: 'Eyebrow Grooming', price: 1500, duration: 20, category: 'Grooming', description: 'Precision eyebrow shaping, threading, or waxing.' },
  { name: 'Waxing', price: 3500, duration: 30, category: 'Skincare', description: 'Smooth body or facial hair removal waxing.' },
  { name: 'Massage', price: 6000, duration: 45, category: 'Wellness', description: 'Relaxing full body or neck & shoulder massage.' }
];

// ── OTP Step Component ────────────────────────────────────────────────────────
const OtpStep = ({ email, onVerify, onResend, error, loading, devOtp }) => {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(600); // 10 min
  const [resending, setResending] = useState(false);
  const refs = useRef([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleChange = (idx, val) => {
    if (val.length > 1) {
      const pasted = val.replace(/\D/g, '').slice(0, 6);
      const next = [...digits];
      pasted.split('').forEach((ch, i) => { if (i < 6) next[i] = ch; });
      setDigits(next);
      refs.current[Math.min(pasted.length, 5)]?.focus();
      return;
    }
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onVerify(digits.join(''));
  };

  const handleResend = async () => {
    setResending(true);
    await onResend();
    setCountdown(600);
    setDigits(['', '', '', '', '', '']);
    refs.current[0]?.focus();
    setResending(false);
  };

  const isComplete = digits.every(d => d !== '');

  return (
    <motion.div
      key="otp"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      className="auth-card"
      style={{ width: '100%', maxWidth: '440px' }}
    >
      <div className="auth-header" style={{ textAlign: 'center', paddingBottom: '0.75rem' }}>
        <div style={{
          width: 58,
          height: 58,
          borderRadius: '50%',
          margin: '0 auto 1.25rem',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)'
        }}>
          <Mail size={26} color="#ffffff" />
        </div>
        <h1>Verify your email</h1>
        <p style={{ marginTop: '0.4rem', lineHeight: 1.5 }}>
          We've sent a 6-digit confirmation code to<br />
          <strong style={{ color: 'var(--text-main)', fontWeight: 700 }}>{email}</strong>
        </p>
      </div>

      <div className="auth-body">
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            color: '#dc2626',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.85rem',
            fontWeight: 500
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {devOtp && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.825rem',
            color: '#b45309'
          }}>
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
              <Sparkles size={15} /> Instant Verification Code
            </div>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: '#4b5563' }}>
              SMTP verification sandbox active. Use this one-click auto-fill:
            </p>
            <button
              type="button"
              onClick={() => {
                const arr = String(devOtp).split('').slice(0, 6);
                setDigits(arr);
                refs.current[5]?.focus();
              }}
              style={{
                width: '100%',
                padding: '0.55rem',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                color: '#92400e',
                fontWeight: 700,
                fontSize: '0.85rem',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <span>⚡ Auto-fill code: <strong>{devOtp}</strong></span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 6 Digit Inputs */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.25rem' }}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => refs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                style={{
                  width: 48,
                  height: 54,
                  textAlign: 'center',
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  borderRadius: '12px',
                  border: d ? '2px solid #10b981' : '1.5px solid var(--border-light)',
                  background: d ? 'rgba(16, 185, 129, 0.05)' : '#f8fafc',
                  color: 'var(--text-main)',
                  outline: 'none',
                  transition: 'all 0.15s ease'
                }}
              />
            ))}
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            {countdown > 0 ? (
              <span>Code expires in <strong style={{ color: countdown < 60 ? '#dc2626' : '#10b981' }}>{fmt(countdown)}</strong></span>
            ) : (
              <span style={{ color: '#dc2626', fontWeight: 600 }}>Code expired. Please request a new one.</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!isComplete || loading || countdown <= 0}
            style={{
              width: '100%',
              padding: '0.85rem',
              fontSize: '0.95rem',
              borderRadius: '14px',
              justifyContent: 'center',
              marginBottom: '0.85rem',
              background: isComplete ? 'linear-gradient(135deg, #10b981, #059669)' : undefined,
              borderColor: isComplete ? '#10b981' : undefined
            }}
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || countdown > 540}
            style={{
              width: '100%',
              padding: '0.65rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'transparent',
              border: '1px solid var(--border-light)',
              borderRadius: '12px',
              color: 'var(--text-muted)',
              cursor: countdown > 540 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              opacity: countdown > 540 ? 0.6 : 1
            }}
          >
            <RefreshCw size={14} className={resending ? 'spin' : ''} />
            {resending ? 'Sending...' : `Resend code${countdown > 540 ? ` (${fmt(countdown - 540)})` : ''}`}
          </button>
        </form>
      </div>
    </motion.div>
  );
};

// ── Main Register Component ───────────────────────────────────────────────────
const Register = () => {
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingFormData, setPendingFormData] = useState(null);
  const [devOtp, setDevOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'user',
    matricNo: '',
    newServices: []
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { initiateRegister, verifyRegistration } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRoleChange = (role) => {
    setError('');
    if (role === 'user') {
      setFormData(prev => ({ ...prev, role: 'user', newServices: [] }));
    } else {
      // Default to first service specialty if none picked yet
      const defaultService = formData.newServices?.[0] || { ...EXPERT_SPECIALTIES[0], type: 'single' };
      setFormData(prev => ({ ...prev, role: 'expert', newServices: [defaultService] }));
    }
  };

  const handleServiceSelect = (serviceName) => {
    const found = EXPERT_SPECIALTIES.find(s => s.name === serviceName);
    if (found) {
      setFormData(prev => ({
        ...prev,
        newServices: [{ ...found, type: 'single' }]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Pre-validate LCU matriculation format before sending
    const matricRegex = /^lcu\/ug\/\d{2}\/\d{4,5}$/i;
    if (!formData.matricNo || !matricRegex.test(formData.matricNo.trim())) {
      const msg = 'Invalid Matric Number. Expected format: LCU/UG/00/00000 (e.g. LCU/UG/22/04192)';
      setError(msg);
      notify.warning(msg);
      return;
    }

    if ((formData.role === 'expert' || formData.role === 'stylist') &&
      (!formData.newServices || formData.newServices.length === 0)) {
      const msg = 'Please choose your single service specialty.';
      setError(msg);
      notify.warning(msg);
      return;
    }

    setLoading(true);
    try {
      const res = await initiateRegister(formData);
      if (res && res.success) {
        setPendingEmail(res.email || formData.email.trim().toLowerCase());
        setPendingFormData(formData);
        if (res.devOtp) setDevOtp(res.devOtp);
        setStep('otp');
        notify.success(res.message || 'Verification code sent to your email.');
      } else {
        const msg = res?.message || 'Failed to send verification code. Please try again.';
        setError(msg);
        notify.error(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.message ||
                  (err.response?.data?.errors?.map(e => e.msg).join(' • ')) ||
                  err.message ||
                  'Failed to send verification code.';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (otp) => {
    setError('');
    setLoading(true);
    try {
      const user = await verifyRegistration(pendingEmail, otp);
      notify.success('Welcome to D.World! Account created 🎉');
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'expert' || user.role === 'stylist') navigate('/expert');
      else navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid verification code. Please try again.';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const res = await initiateRegister(pendingFormData);
      if (res?.devOtp) setDevOtp(res.devOtp);
      notify.info('New verification code sent to your email.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend code.';
      setError(msg);
      notify.error(msg);
    }
  };

  const selectedExpertService = formData.newServices?.[0] || null;

  return (
    <div className="page-wrapper flex-center animate-fade-in" style={{ padding: '2.5rem 1rem' }}>
      <AnimatePresence mode="wait">
        {step === 'otp' ? (
          <OtpStep
            key="otp"
            email={pendingEmail}
            onVerify={handleVerify}
            onResend={handleResend}
            error={error}
            loading={loading}
            devOtp={devOtp}
          />
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="auth-card"
            style={{ width: '100%', maxWidth: '580px' }}
          >
            {/* Header */}
            <div className="auth-header">
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.25rem 0.75rem',
                background: 'rgba(79, 70, 229, 0.08)',
                color: 'var(--primary)',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '0.75rem'
              }}>
                <Sparkles size={12} /> Lead City University Portal
              </div>
              <h1>Create an account</h1>
              <p>Book campus styling & services or register as a student expert</p>
            </div>

            <div className="auth-body">
              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#dc2626',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  fontSize: '0.85rem',
                  fontWeight: 500
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Segmented Account Type Selector */}
              <div style={{ marginBottom: '1.35rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '0.45rem'
                }}>
                  I want to join as:
                </label>
                <div className="role-segment-track">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('user')}
                    className={`role-segment-btn ${formData.role === 'user' ? 'active' : ''}`}
                  >
                    <User size={16} />
                    <span>Client / Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleChange('expert')}
                    className={`role-segment-btn ${(formData.role === 'expert' || formData.role === 'stylist') ? 'active' : ''}`}
                  >
                    <Briefcase size={16} />
                    <span>Service Expert</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {/* 2-Column Responsive Layout: Name & Phone */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.15rem'
                }}>
                  {/* Full Name */}
                  <div className="input-group" style={{ margin: 0 }}>
                    <label htmlFor="name">
                      <span>Full Name</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 500 }}>Required</span>
                    </label>
                    <div className="auth-input-wrapper">
                      <span className="auth-input-icon">
                        <User size={18} />
                      </span>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="e.g. Adebayo Daniel"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="auth-input-field"
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="input-group" style={{ margin: 0 }}>
                    <label htmlFor="phone">
                      <span>Phone Number</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 500 }}>Optional</span>
                    </label>
                    <div className="auth-input-wrapper">
                      <span className="auth-input-icon">
                        <Phone size={18} />
                      </span>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="0803 555 0199"
                        value={formData.phone}
                        onChange={handleChange}
                        className="auth-input-field"
                      />
                    </div>
                  </div>
                </div>

                {/* 2-Column Responsive Layout: Email & LCU Matric No */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.15rem'
                }}>
                  {/* Email */}
                  <div className="input-group" style={{ margin: 0 }}>
                    <label htmlFor="email">
                      <span>Email Address</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 500 }}>Active email</span>
                    </label>
                    <div className="auth-input-wrapper">
                      <span className="auth-input-icon">
                        <Mail size={18} />
                      </span>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="auth-input-field"
                      />
                    </div>
                  </div>

                  {/* LCU Matriculation Number */}
                  <div className="input-group" style={{ margin: 0 }}>
                    <label htmlFor="matricNo">
                      <span>LCU Matric No</span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        background: 'rgba(79, 70, 229, 0.08)',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '6px'
                      }}>
                        LCU/UG/00/00000
                      </span>
                    </label>
                    <div className="auth-input-wrapper">
                      <span className="auth-input-icon">
                        <ShieldCheck size={18} style={{ color: 'var(--primary)' }} />
                      </span>
                      <input
                        id="matricNo"
                        name="matricNo"
                        type="text"
                        placeholder="LCU/UG/22/04521"
                        value={formData.matricNo || ''}
                        onChange={handleChange}
                        required
                        className="auth-input-field"
                        style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Password Field with Show/Hide Toggle */}
                <div className="input-group" style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="password">
                    <span>Password</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 500 }}>Min 6 characters</span>
                  </label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <Lock size={18} />
                    </span>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength="6"
                      className="auth-input-field"
                      style={{ paddingRight: '2.85rem !important' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="auth-input-toggle-btn"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Expert Specialty Service Selection (Sleek Compact Picker) */}
                {(formData.role === 'expert' || formData.role === 'stylist') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.04), rgba(79, 70, 229, 0.06))',
                      border: '1.5px solid rgba(124, 58, 237, 0.25)',
                      borderRadius: '16px',
                      padding: '1.1rem 1.25rem',
                      marginBottom: '1.35rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        ⚡ Single Specialty Service
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: '#dcfce7',
                        color: '#15803d',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px'
                      }}>
                        1 Service Enforced
                      </span>
                    </div>

                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.85rem', lineHeight: 1.4 }}>
                      D.World assigns each expert exactly 1 primary service. Select your specialty:
                    </p>

                    {/* Custom Dropdown Selector */}
                    <div className="auth-input-wrapper" style={{ marginBottom: '0.75rem' }}>
                      <span className="auth-input-icon">
                        <Briefcase size={18} style={{ color: 'var(--secondary)' }} />
                      </span>
                      <select
                        value={selectedExpertService?.name || ''}
                        onChange={(e) => handleServiceSelect(e.target.value)}
                        className="auth-input-field"
                        style={{
                          cursor: 'pointer',
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          appearance: 'none',
                          WebkitAppearance: 'none'
                        }}
                      >
                        {EXPERT_SPECIALTIES.map(s => (
                          <option key={s.name} value={s.name}>
                            {s.name} — ₦{s.price.toLocaleString()} ({s.duration} mins)
                          </option>
                        ))}
                      </select>
                      <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }}>
                        <ChevronDown size={18} />
                      </span>
                    </div>

                    {/* Selected Service Quick Summary Pill */}
                    {selectedExpertService && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#ffffff',
                        padding: '0.65rem 0.95rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(124, 58, 237, 0.15)',
                        fontSize: '0.8rem'
                      }}>
                        <div>
                          <strong style={{ color: 'var(--text-main)', display: 'block' }}>{selectedExpertService.name}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{selectedExpertService.description}</span>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.75rem' }}>
                          <strong style={{ color: 'var(--secondary)', fontSize: '0.95rem', display: 'block' }}>
                            ₦{selectedExpertService.price.toLocaleString()}
                          </strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>{selectedExpertService.duration} mins</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Submit Action */}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: '50px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    borderRadius: '14px',
                    justifyContent: 'center',
                    boxShadow: '0 8px 20px rgba(79, 70, 229, 0.25)',
                    marginTop: '0.35rem'
                  }}
                >
                  {loading ? (
                    'Preparing verification code...'
                  ) : (
                    <>
                      <span>Continue to Verification</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              {/* Footer Links */}
              <div style={{
                marginTop: '1.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--border-light)',
                textAlign: 'center',
                fontSize: '0.875rem',
                color: 'var(--text-muted)'
              }}>
                Already have an account?{' '}
                <Link
                  to="/login"
                  style={{
                    color: 'var(--primary)',
                    fontWeight: 700,
                    textDecoration: 'none',
                    marginLeft: '0.25rem'
                  }}
                >
                  Sign in
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Register;
