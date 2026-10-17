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
    <div className="page-wrapper flex-center animate-fade-in" style={{ padding: '2rem 1rem' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="app-card" 
        style={{ width: '100%', maxWidth: '420px' }}
      >
        {!submitted ? (
          <>
            <div className="card-header" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ background: '#e0e7ff', padding: '0.75rem', borderRadius: '50%', color: 'var(--primary)', marginBottom: '1rem' }}>
                <KeyRound size={28} />
              </div>
              <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>Forgot Password</h1>
              <p style={{ margin: 0 }}>No worries, we'll send you reset instructions.</p>
            </div>

            <div className="card-body">
              {error && (
                <div style={{ 
                  background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5',
                  padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', 
                  display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', fontWeight: 500
                }}>
                  <AlertCircle size={18} />
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
                  style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', fontSize: '1rem' }} disabled={loading}
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
            <div className="card-header" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ background: '#dcfce7', padding: '0.75rem', borderRadius: '50%', color: '#15803d', marginBottom: '1rem' }}>
                <Mail size={28} />
              </div>
              <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>Check your email</h1>
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                We sent a password reset link to <br/>
                <strong style={{ color: 'var(--text-main)' }}>{email}</strong>
              </p>
            </div>
            <div className="card-body">
              <button onClick={() => setSubmitted(false)} className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}>
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
