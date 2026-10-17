import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Mail, ArrowLeft, KeyRound, AlertCircle, 
  Lock, Eye, EyeOff, ArrowRight, CheckCircle2,
  ShieldCheck, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config/api';

// ─── Multi-step Forgot Password ───────────────────────────────────────────────
// Step 1: Enter email  →  Backend sends 6-digit OTP
// Step 2: Enter OTP    →  Backend verifies, returns JWT reset token
// Step 3: New password →  Backend sets new password with the JWT
// Step 4: Success screen

const STEPS = { EMAIL: 1, OTP: 2, NEWPASS: 3, DONE: 4 };

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Step 1: Request OTP ─────────────────────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/forgot-password`, { email });
      if (res.data.success) {
        setStep(STEPS.OTP);
        startResendCooldown();
      } else {
        setError(res.data.message || 'Failed to send code. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.trim().length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/verify`, { email, otp: otp.trim() });
      if (res.data.success && res.data.token) {
        setResetToken(res.data.token);
        setStep(STEPS.NEWPASS);
      } else {
        setError(res.data.message || 'Invalid or expired code. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Set New Password ────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/reset-password`, {
        email,
        token: resetToken,
        password: newPassword
      });
      if (res.data.success) {
        setStep(STEPS.DONE);
      } else {
        setError(res.data.message || 'Failed to reset password. Please start over.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired session. Please start over.');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP with 60s cooldown ────────────────────────────────────────────
  const startResendCooldown = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      startResendCooldown();
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit:    { opacity: 0, x: -20 }
  };

  return (
    <div className="page-wrapper flex-center animate-fade-in" style={{ padding: '2.5rem 1rem' }}>
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="auth-card" 
        style={{ width: '100%', maxWidth: '440px' }}
      >
        {/* ── Progress Indicator ─────────────────── */}
        {step !== STEPS.DONE && (
          <div style={{ 
            padding: '1rem 2.25rem 0',
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.35rem'
          }}>
            {[STEPS.EMAIL, STEPS.OTP, STEPS.NEWPASS].map((s) => (
              <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{
                  height: '3px',
                  flex: 1,
                  borderRadius: '999px',
                  background: step >= s
                    ? 'linear-gradient(90deg, var(--primary), var(--secondary))'
                    : 'var(--border-light)',
                  transition: 'background 0.4s ease'
                }} />
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* ════════ STEP 1 — Enter Email ════════ */}
          {step === STEPS.EMAIL && (
            <motion.div key="step1" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
              <div className="auth-header" style={{ textAlign: 'center' }}>
                <div style={{ background: 'var(--primary-light)', padding: '0.9rem', borderRadius: '50%', color: 'var(--primary)', marginBottom: '1.1rem', display: 'inline-flex' }}>
                  <KeyRound size={28} />
                </div>
                <h1>Forgot Password?</h1>
                <p>Enter your email and we'll send a 6-digit reset code.</p>
              </div>

              <div className="auth-body">
                <ErrorAlert message={error} />
                <form onSubmit={handleRequestOtp}>
                  <div className="input-group">
                    <label htmlFor="fp-email">Email address</label>
                    <div className="auth-input-wrapper">
                      <span className="auth-input-icon"><Mail size={18} /></span>
                      <input 
                        id="fp-email"
                        type="email" 
                        placeholder="name@example.com" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        className="auth-input-field"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" className="btn btn-primary" 
                    style={{ width: '100%', height: '48px', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 700, justifyContent: 'center', marginTop: '0.25rem' }} 
                    disabled={loading}
                  >
                    {loading ? 'Sending code...' : <><span>Send Reset Code</span><ArrowRight size={17} /></>}
                  </button>
                </form>
              </div>

              <div className="card-footer" style={{ justifyContent: 'center' }}>
                <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
                  <ArrowLeft size={16} /> Back to log in
                </Link>
              </div>
            </motion.div>
          )}

          {/* ════════ STEP 2 — Enter OTP ════════ */}
          {step === STEPS.OTP && (
            <motion.div key="step2" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
              <div className="auth-header" style={{ textAlign: 'center' }}>
                <div style={{ background: 'rgba(124, 58, 237, 0.08)', padding: '0.9rem', borderRadius: '50%', color: 'var(--secondary)', marginBottom: '1.1rem', display: 'inline-flex' }}>
                  <ShieldCheck size={28} />
                </div>
                <h1>Check Your Email</h1>
                <p>
                  We sent a 6-digit code to{' '}
                  <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{email}</strong>
                </p>
              </div>

              <div className="auth-body">
                <ErrorAlert message={error} />
                <form onSubmit={handleVerifyOtp}>
                  <div className="input-group">
                    <label htmlFor="fp-otp">Verification Code</label>
                    <input 
                      id="fp-otp"
                      type="text" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="Enter 6-digit code" 
                      value={otp} 
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                      required 
                      style={{ 
                        textAlign: 'center', 
                        fontSize: '1.6rem', 
                        fontWeight: 700, 
                        letterSpacing: '0.3em',
                        fontFamily: 'Outfit',
                        padding: '0.85rem'
                      }}
                    />
                  </div>

                  <button 
                    type="submit" className="btn btn-primary" 
                    style={{ width: '100%', height: '48px', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 700, justifyContent: 'center', marginTop: '0.25rem' }} 
                    disabled={loading || otp.length < 6}
                  >
                    {loading ? 'Verifying...' : <><span>Verify Code</span><ArrowRight size={17} /></>}
                  </button>
                </form>

                {/* Resend link */}
                <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Didn't receive the code?{' '}
                  <button
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || loading}
                    style={{ 
                      background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                      color: resendCooldown > 0 ? 'var(--text-subtle)' : 'var(--primary)',
                      fontWeight: 600, fontSize: '0.875rem', padding: 0,
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                    }}
                  >
                    {resendCooldown > 0 
                      ? `Resend in ${resendCooldown}s` 
                      : <><RefreshCw size={13} /> Resend code</>}
                  </button>
                </div>
              </div>

              <div className="card-footer" style={{ justifyContent: 'center' }}>
                <button 
                  onClick={() => { setStep(STEPS.EMAIL); setError(''); setOtp(''); }}
                  style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}
                >
                  <ArrowLeft size={16} /> Change email
                </button>
              </div>
            </motion.div>
          )}

          {/* ════════ STEP 3 — New Password ════════ */}
          {step === STEPS.NEWPASS && (
            <motion.div key="step3" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
              <div className="auth-header" style={{ textAlign: 'center' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '0.9rem', borderRadius: '50%', color: 'var(--accent)', marginBottom: '1.1rem', display: 'inline-flex' }}>
                  <Lock size={28} />
                </div>
                <h1>Set New Password</h1>
                <p>Choose a strong password for your account.</p>
              </div>

              <div className="auth-body">
                <ErrorAlert message={error} />
                <form onSubmit={handleResetPassword}>
                  <div className="input-group">
                    <label htmlFor="fp-newpass">New Password</label>
                    <div className="auth-input-wrapper">
                      <span className="auth-input-icon"><Lock size={18} /></span>
                      <input
                        id="fp-newpass"
                        type={showNew ? 'text' : 'password'}
                        placeholder="Minimum 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        className="auth-input-field"
                        style={{ paddingRight: '2.85rem' }}
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="auth-input-toggle-btn" tabIndex={-1}>
                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="fp-confirm">Confirm Password</label>
                    <div className="auth-input-wrapper">
                      <span className="auth-input-icon"><Lock size={18} /></span>
                      <input
                        id="fp-confirm"
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="auth-input-field"
                        style={{ paddingRight: '2.85rem' }}
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="auth-input-toggle-btn" tabIndex={-1}>
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {/* Password match indicator */}
                    {confirmPassword.length > 0 && (
                      <div style={{ 
                        marginTop: '0.4rem', fontSize: '0.8rem', fontWeight: 600,
                        color: newPassword === confirmPassword ? 'var(--success)' : 'var(--error)',
                        display: 'flex', alignItems: 'center', gap: '0.3rem'
                      }}>
                        {newPassword === confirmPassword 
                          ? <><CheckCircle2 size={13} /> Passwords match</> 
                          : <><AlertCircle size={13} /> Passwords don't match</>}
                      </div>
                    )}
                  </div>

                  <button 
                    type="submit" className="btn btn-primary" 
                    style={{ width: '100%', height: '48px', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 700, justifyContent: 'center', marginTop: '0.5rem' }} 
                    disabled={loading || newPassword !== confirmPassword || newPassword.length < 6}
                  >
                    {loading ? 'Updating...' : <><span>Reset Password</span><ArrowRight size={17} /></>}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ════════ STEP 4 — Success ════════ */}
          {step === STEPS.DONE && (
            <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
              <div className="auth-header" style={{ textAlign: 'center' }}>
                <motion.div 
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 20 }}
                  style={{ background: 'var(--success-glow)', padding: '0.9rem', borderRadius: '50%', color: 'var(--success)', marginBottom: '1.1rem', display: 'inline-flex' }}
                >
                  <CheckCircle2 size={34} />
                </motion.div>
                <h1>Password Reset!</h1>
                <p>Your password has been updated successfully. You can now log in.</p>
              </div>
              <div className="auth-body">
                <Link 
                  to="/login" 
                  className="btn btn-primary" 
                  style={{ width: '100%', height: '48px', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 700, justifyContent: 'center', display: 'flex' }}
                >
                  Continue to Login <ArrowRight size={17} />
                </Link>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// ── Reusable error alert ──────────────────────────────────────────────────────
const ErrorAlert = ({ message }) => {
  if (!message) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      style={{ 
        background: 'var(--error-glow)', color: '#dc2626',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        padding: '0.85rem 1rem', borderRadius: '12px', marginBottom: '1.25rem', 
        display: 'flex', alignItems: 'center', gap: '0.65rem',
        fontSize: '0.85rem', fontWeight: 500
      }}
    >
      <AlertCircle size={16} style={{ flexShrink: 0 }} />
      <span>{message}</span>
    </motion.div>
  );
};

export default ForgotPassword;
