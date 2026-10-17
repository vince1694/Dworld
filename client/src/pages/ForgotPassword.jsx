import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      if (email === 'error@test.com') {
        setError('Failed to send reset link. Please try again later.');
      } else {
        setSubmitted(true);
      }
    }, 1500);
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
        {!submitted ? (
          <>
            <div className="auth-header" style={{ textAlign: 'center' }}>
              <div style={{ background: 'var(--primary-light)', padding: '0.85rem', borderRadius: '50%', color: 'var(--primary)', marginBottom: '1rem', display: 'inline-flex' }}>
                <KeyRound size={28} />
              </div>
              <h1>Forgot Password</h1>
              <p>No worries, we'll send you reset instructions.</p>
            </div>

            <div className="auth-body">
              {error && (
                <div style={{ 
                  background: 'var(--error-glow)',
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
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label htmlFor="email">Email address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                    <input 
                      id="email" type="email" placeholder="name@example.com" 
                      value={email} onChange={(e) => setEmail(e.target.value)} required style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>

                <button 
                  type="submit" className="btn btn-primary" 
                  style={{ width: '100%', height: '48px', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 700, justifyContent: 'center', marginTop: '0.5rem' }} disabled={loading}
                >
                  {loading ? 'Sending link...' : 'Reset password'}
                </button>
              </form>
            </div>
            
            <div className="card-footer" style={{ justifyContent: 'center' }}>
              <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500 }}>
                <ArrowLeft size={16} /> Back to log in
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="auth-header" style={{ textAlign: 'center' }}>
              <div style={{ background: 'var(--success-glow)', padding: '0.85rem', borderRadius: '50%', color: 'var(--success)', marginBottom: '1rem', display: 'inline-flex' }}>
                <Mail size={28} />
              </div>
              <h1>Check your email</h1>
              <p style={{ lineHeight: 1.5 }}>
                We sent a password reset link to <br/>
                <strong style={{ color: 'var(--text-main)' }}>{email}</strong>
              </p>
            </div>
            <div className="auth-body">
              <button onClick={() => setSubmitted(false)} className="btn btn-secondary" style={{ width: '100%', height: '48px', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 600, justifyContent: 'center' }}>
                Didn't receive the email? Click to resend
              </button>
            </div>
            <div className="card-footer" style={{ justifyContent: 'center' }}>
              <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500 }}>
                <ArrowLeft size={16} /> Back to log in
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
