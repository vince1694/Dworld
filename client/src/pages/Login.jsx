import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { Mail, Lock, LogIn, AlertCircle, Eye, EyeOff, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      notify.success(`Welcome back, ${user.name || 'there'}! 👋`);
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'expert' || user.role === 'stylist') {
        navigate('/expert');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to login. Please check your credentials.';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
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
        <div className="auth-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <Link to="/">
              <img 
                src="/logo.png" 
                alt="D.WORLD Official Logo" 
                style={{ width: 68, height: 68, borderRadius: 18, objectFit: 'cover', boxShadow: '0 8px 24px rgba(79, 70, 229, 0.25)' }} 
              />
            </Link>
          </div>
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
            <Sparkles size={12} /> Lead City University
          </div>
          <h1>Welcome back</h1>
          <p>Sign in to access your appointments & services</p>
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

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">
                <span>Email address</span>
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <Mail size={18} />
                </span>
                <input 
                  id="email"
                  type="email"
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="auth-input-field"
                />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="password">
                <span>Password</span>
                <Link to="/forgot-password" style={{ color: 'var(--primary)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600 }}>
                  Forgot password?
                </Link>
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <Lock size={18} />
                </span>
                <input 
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

            <button 
              type="submit"
              className="btn btn-primary" 
              style={{
                width: '100%',
                height: '48px',
                fontSize: '0.95rem',
                fontWeight: 700,
                borderRadius: '14px',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(79, 70, 229, 0.25)',
                marginTop: '0.5rem'
              }}
              disabled={loading}
            >
              {loading ? (
                'Signing in...'
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-light)',
            textAlign: 'center',
            fontSize: '0.875rem',
            color: 'var(--text-muted)'
          }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none', marginLeft: '0.25rem' }}>
              Sign up
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
