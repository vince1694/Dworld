import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'expert' || user.role === 'stylist') {
        navigate('/expert');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper flex-center animate-fade-in" style={{ padding: '2rem 1rem' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="auth-card" 
        style={{ width: '100%', maxWidth: '420px' }}
      >
        <div className="card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1.75rem 2rem 1.25rem 2rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.35rem', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>Log in to your account</h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Enter your details below to access D.world</p>
        </div>

        <div className="card-body" style={{ padding: '2rem' }}>
          {error && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '0.85rem 1.25rem', borderRadius: '9999px', marginBottom: '1.5rem', 
              display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', fontWeight: 500
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                <input 
                  id="email" type="email" placeholder="name@example.com" 
                  value={email} onChange={(e) => setEmail(e.target.value)} required style={{ paddingLeft: '3rem' }}
                />
              </div>
            </div>

            <div className="input-group">
              <div className="flex-between">
                <label htmlFor="password" style={{ marginBottom: '0.4rem' }}>Password</label>
                <Link to="/forgot-password" style={{ color: 'var(--primary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500, marginBottom: '0.4rem' }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                <input 
                  id="password" type="password" placeholder="••••••••" 
                  value={password} onChange={(e) => setPassword(e.target.value)} required style={{ paddingLeft: '3rem' }}
                />
              </div>
            </div>

            <button 
              type="submit" className="btn btn-primary" 
              style={{ width: '100%', padding: '0.75rem 1.5rem', marginTop: '0.75rem', fontSize: '0.95rem', borderRadius: '9999px' }} disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="card-footer" style={{ justifyContent: 'center', padding: '1.25rem 2rem' }}>
          <span style={{ color: 'var(--text-subtle)', fontSize: '0.9rem' }}>
            Don't have an account? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', marginLeft: '0.5rem' }}>Sign up</Link>
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
