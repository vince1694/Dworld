import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, AlertCircle, Phone, ShieldCheck, CheckCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── OTP Step ────────────────────────────────────────────────────────────────
const OtpStep = ({ email, onVerify, onResend, error, loading }) => {
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
    // Handle paste
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
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3 }}
      className="auth-card"
      style={{ width: '100%', maxWidth: '420px' }}
    >
      <div className="card-header" style={{ flexDirection: 'column', alignItems: 'center', padding: '2rem 2rem 1.25rem' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', marginBottom: '1rem',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 24px rgba(16,185,129,0.35)'
        }}>
          <Mail size={24} color="#fff" />
        </div>
        <h1 style={{ fontSize: '1.4rem', marginBottom: '0.35rem', textAlign: 'center', color: 'var(--text-main)' }}>
          Check your email
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          We sent a 6-digit code to<br />
          <strong style={{ color: 'var(--text-main)' }}>{email}</strong>
        </p>
      </div>

      <div className="card-body" style={{ padding: '1.5rem 2rem 2rem' }}>
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '0.85rem 1.25rem', borderRadius: '9999px', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', fontWeight: 500
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 6 digit boxes */}
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
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
                  width: 48, height: 56,
                  textAlign: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  borderRadius: '12px',
                  border: d ? '2px solid #10b981' : '2px solid var(--border-light)',
                  background: d ? 'rgba(16,185,129,0.07)' : 'var(--surface)',
                  color: 'var(--text-main)',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                  caretColor: '#10b981'
                }}
              />
            ))}
          </div>

          {/* Countdown */}
          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            {countdown > 0 ? (
              <>Code expires in <strong style={{ color: countdown < 60 ? '#f87171' : '#10b981' }}>{fmt(countdown)}</strong></>
            ) : (
              <span style={{ color: '#f87171' }}>Code expired. Please resend.</span>
            )}
          </p>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!isComplete || loading || countdown <= 0}
            style={{
              width: '100%', padding: '0.8rem', fontSize: '0.95rem', marginBottom: '0.75rem',
              background: isComplete ? 'linear-gradient(135deg, #10b981, #059669)' : undefined,
              borderColor: isComplete ? '#10b981' : undefined
            }}
          >
            {loading ? 'Verifying…' : 'Verify & Create Account'}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || countdown > 540}
            style={{
              width: '100%', padding: '0.7rem', fontSize: '0.875rem', fontWeight: 600,
              background: 'transparent', border: '1px solid var(--border-light)',
              borderRadius: '9999px', color: 'var(--text-muted)', cursor: countdown > 540 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              transition: 'all 0.2s ease', opacity: countdown > 540 ? 0.5 : 1
            }}
          >
            <RefreshCw size={14} />
            {resending ? 'Sending…' : `Resend code${countdown > 540 ? ` (wait ${fmt(countdown - 540)})` : ''}`}
          </button>
        </form>
      </div>
    </motion.div>
  );
};

// ── Main Register Page ────────────────────────────────────────────────────────
const Register = () => {
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingFormData, setPendingFormData] = useState(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', role: 'user', matricNo: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { initiateRegister, verifyRegistration } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if ((formData.role === 'expert' || formData.role === 'stylist') &&
      (!formData.newServices || formData.newServices.length === 0)) {
      setError('Please select your single service specialty.');
      return;
    }

    setLoading(true);
    try {
      const res = await initiateRegister(formData);
      if (res.success) {
        setPendingEmail(res.email || formData.email.trim().toLowerCase());
        setPendingFormData(formData);
        setStep('otp');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (otp) => {
    setError('');
    setLoading(true);
    try {
      const user = await verifyRegistration(pendingEmail, otp);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'expert' || user.role === 'stylist') navigate('/expert');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await initiateRegister(pendingFormData);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    }
  };

  return (
    <div className="page-wrapper flex-center animate-fade-in" style={{ padding: '2rem 1rem' }}>
      <AnimatePresence mode="wait">
        {step === 'otp' ? (
          <OtpStep
            key="otp"
            email={pendingEmail}
            onVerify={handleVerify}
            onResend={handleResend}
            error={error}
            loading={loading}
          />
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.3 }}
            className="auth-card"
            style={{ width: '100%', maxWidth: '450px' }}
          >
            <div className="card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1.75rem 2rem 1.25rem 2rem' }}>
              <h1 style={{ fontSize: '1.5rem', marginBottom: '0.35rem', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                Create an account
              </h1>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Join D.world to book or provide services
              </p>
            </div>

            <div className="card-body" style={{ padding: '2rem' }}>
              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)', color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  padding: '0.85rem 1.25rem', borderRadius: '9999px', marginBottom: '1.5rem',
                  display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', fontWeight: 500
                }}>
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label htmlFor="name">Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                    <input id="name" name="name" type="text" placeholder="John Doe"
                      value={formData.name} onChange={handleChange} required style={{ paddingLeft: '3rem' }} />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="email">Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                    <input id="email" name="email" type="email" placeholder="name@example.com"
                      value={formData.email} onChange={handleChange} required style={{ paddingLeft: '3rem' }} />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="phone">Phone Number (Optional)</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                    <input id="phone" name="phone" type="text" placeholder="+234 803 555 0199"
                      value={formData.phone} onChange={handleChange} style={{ paddingLeft: '3rem' }} />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="matricNo">LCU Matriculation Number</label>
                  <div style={{ position: 'relative' }}>
                    <ShieldCheck size={16} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                    <input id="matricNo" name="matricNo" type="text" placeholder="LCU/UG/22/04521"
                      value={formData.matricNo || ''} onChange={handleChange}
                      required style={{ paddingLeft: '3rem', textTransform: 'uppercase' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
                    Accepted format: LCU/UG/00/00000
                  </span>
                </div>

                <div className="input-group">
                  <label htmlFor="password">Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                    <input id="password" name="password" type="password" placeholder="••••••••"
                      value={formData.password} onChange={handleChange} required minLength="6" style={{ paddingLeft: '3rem' }} />
                  </div>
                </div>

                {/* Account type selector */}
                <div className="input-group">
                  <label style={{ marginBottom: '0.75rem', display: 'block' }}>Select Account Type</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div onClick={() => setFormData({ ...formData, role: 'user' })} style={{
                      padding: '0.85rem 0.75rem', borderRadius: '14px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease',
                      border: formData.role === 'user' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                      background: formData.role === 'user' ? 'rgba(79, 70, 229, 0.08)' : '#f8fafc'
                    }}>
                      <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '0.2rem' }}>👤</span>
                      <strong style={{ fontSize: '0.875rem', display: 'block', color: 'var(--text-main)', fontFamily: 'Outfit' }}>Client Account</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Book appointments & services</span>
                    </div>

                    <div onClick={() => setFormData({ ...formData, role: 'expert' })} style={{
                      padding: '0.85rem 0.75rem', borderRadius: '14px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease',
                      border: (formData.role === 'expert' || formData.role === 'stylist') ? '2px solid var(--secondary)' : '1px solid var(--border-light)',
                      background: (formData.role === 'expert' || formData.role === 'stylist') ? 'rgba(124, 58, 237, 0.08)' : '#f8fafc'
                    }}>
                      <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '0.2rem' }}>⚡</span>
                      <strong style={{ fontSize: '0.875rem', display: 'block', color: 'var(--text-main)', fontFamily: 'Outfit' }}>Service Expert</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Provide & manage services</span>
                    </div>
                  </div>
                </div>

                {/* Expert single service picker */}
                {(formData.role === 'expert' || formData.role === 'stylist') && (
                  <div className="input-group" style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <label style={{ margin: 0, color: 'var(--secondary)', fontWeight: 800, fontSize: '0.9rem' }}>
                        ⚡ Your Single Service Specialty
                      </label>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '6px',
                        background: (formData.newServices?.length === 1) ? '#dcfce7' : '#fee2e2',
                        color: (formData.newServices?.length === 1) ? '#15803d' : '#b91c1c'
                      }}>
                        {(formData.newServices?.length === 1) ? '✓ 1 Selected' : 'Required'}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 0.85rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                      Each expert specializes in exactly 1 single service on D.world. Choose yours:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                      {[
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
                      ].map(svc => {
                        const isSelected = (formData.newServices || []).some(s => s.name === svc.name);
                        return (
                          <label key={svc.name} style={{
                            display: 'flex', alignItems: 'center', gap: '0.65rem',
                            padding: '0.55rem 0.75rem', borderRadius: '10px', cursor: 'pointer',
                            background: isSelected ? 'rgba(124, 58, 237, 0.08)' : '#ffffff',
                            border: isSelected ? '2px solid var(--secondary)' : '1px solid var(--border-light)',
                            fontSize: '0.825rem', transition: 'all 0.15s ease'
                          }}>
                            <input type="radio" name="expertServiceRadio" checked={isSelected}
                              onChange={() => { setError(''); setFormData({ ...formData, newServices: [{ ...svc, type: 'single' }] }); }} />
                            <span style={{ fontWeight: isSelected ? 700 : 500, color: 'var(--text-main)', flex: 1 }}>{svc.name}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{svc.duration}m</span>
                            <strong style={{ color: 'var(--secondary)' }}>₦{svc.price.toLocaleString()}</strong>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ flex: 1, height: 3, borderRadius: 99, background: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Step 1 of 2</span>
                  <div style={{ flex: 1, height: 3, borderRadius: 99, background: 'var(--border-light)' }} />
                </div>

                <button type="submit" className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem 1.5rem', fontSize: '0.95rem' }} disabled={loading}>
                  {loading ? 'Sending verification code…' : 'Continue →'}
                </button>
              </form>
            </div>

            <div className="card-footer" style={{ justifyContent: 'center', padding: '1.25rem 2rem' }}>
              <span style={{ color: 'var(--text-subtle)', fontSize: '0.9rem' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', marginLeft: '0.25rem' }}>
                  Sign in
                </Link>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Register;
