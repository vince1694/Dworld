import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { 
  Mail, 
  Lock, 
  LogIn, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ArrowRight,
  User,
  Briefcase
} from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryRole = searchParams.get('role');
  const [selectedRole, setSelectedRole] = useState(
    queryRole === 'expert' ? 'expert' : 'user'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user: currentUser } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();

  // If already authenticated, redirect smoothly to corresponding dashboard or intended destination
  useEffect(() => {
    if (currentUser) {
      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl) {
        navigate(redirectUrl, { replace: true });
        return;
      }
      if (currentUser.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (currentUser.role === 'expert' || currentUser.role === 'stylist') {
        navigate('/expert', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [currentUser, navigate, searchParams]);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError('');
    setSearchParams({ role });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError('Please provide your email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(cleanEmail, password);
      const redirectUrl = searchParams.get('redirect');

      // Route smoothly according to registered user role or redirect destination
      if (redirectUrl && (user.role === 'user' || user.role === 'customer')) {
        notify.success(`Welcome back, ${user.name || 'there'}! 👋`);
        navigate(redirectUrl, { replace: true });
      } else if (user.role === 'admin') {
        notify.success(`Welcome back, Admin ${user.name || ''}!`);
        navigate('/admin', { replace: true });
      } else if (user.role === 'expert' || user.role === 'stylist') {
        notify.success(`Welcome back, Specialist ${user.name || ''}! ✂️`);
        navigate('/expert', { replace: true });
      } else {
        notify.success(`Welcome back, ${user.name || 'there'}! 👋`);
        navigate(redirectUrl || '/dashboard', { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || (err.code === 'ECONNABORTED' 
        ? 'Connection timed out. Please check your network and try again.' 
        : 'Failed to sign in. Please verify your credentials.');
      setError(msg);
      notify.error(msg);
      setLoading(false);
    }
  };

  const roleConfig = {
    user: {
      badge: 'Student Account',
      badgeIcon: <Sparkles size={12} />,
      badgeBg: 'rgba(79, 70, 229, 0.08)',
      badgeColor: 'var(--primary)',
      title: 'Welcome back',
      subtitle: 'Sign in to access your appointments & student wallet',
      emailLabel: 'Student Email Address',
      emailPlaceholder: 'student@campus.edu.ng or personal email',
      registerText: "Don't have an account?",
      registerAction: 'Sign up as a Student',
      registerLink: '/register?role=user'
    },
    expert: {
      badge: 'Verified Specialist',
      badgeIcon: <Sparkles size={12} />,
      badgeBg: 'rgba(168, 85, 247, 0.1)',
      badgeColor: '#9333ea',
      title: 'Specialist Portal',
      subtitle: 'Sign in to manage your schedule, clients & wallet earnings',
      emailLabel: 'Specialist Email Address',
      emailPlaceholder: 'specialist@campus.edu.ng or personal email',
      registerText: 'Want to offer services?',
      registerAction: 'Register as a Specialist',
      registerLink: '/register?role=expert'
    }
  };

  const currentConfig = roleConfig[selectedRole] || roleConfig.user;

  return (
    <div className="page-wrapper flex-center animate-fade-in" style={{ padding: '2.5rem 1rem' }}>
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="auth-card" 
        style={{ width: '100%', maxWidth: '450px' }}
      >
        <div className="auth-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <Link to="/">
              <img 
                src="/logo-192.png" 
                alt="D.WORLD Official Logo" 
                width="68"
                height="68"
                loading="eager"
                decoding="async"
                style={{ 
                  width: 68, 
                  height: 68, 
                  borderRadius: 18, 
                  objectFit: 'cover', 
                  boxShadow: '0 8px 24px rgba(79, 70, 229, 0.25)',
                  transform: 'translateZ(0)',
                  willChange: 'transform'
                }} 
              />
            </Link>
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.25rem 0.75rem',
            background: currentConfig.badgeBg,
            color: currentConfig.badgeColor,
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
            transition: 'all 0.2s ease'
          }}>
            {currentConfig.badgeIcon} {currentConfig.badge}
          </div>
          <h1>{currentConfig.title}</h1>
          <p>{currentConfig.subtitle}</p>
        </div>

        <div className="auth-body">
          {/* Segmented Role Login Selector */}
          <div style={{ marginBottom: '1.35rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem'
            }}>
              Sign in as:
            </label>
            <div className="role-segment-track">
              <button
                type="button"
                onClick={() => handleRoleSelect('user')}
                className={`role-segment-btn ${selectedRole === 'user' ? 'active' : ''}`}
              >
                <User size={16} />
                <span>Client / Student</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('expert')}
                className={`role-segment-btn ${selectedRole === 'expert' ? 'active' : ''}`}
              >
                <Briefcase size={16} />
                <span>Service Specialist</span>
              </button>
            </div>
          </div>

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
                <span>{currentConfig.emailLabel}</span>
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <Mail size={18} />
                </span>
                <input 
                  id="email"
                  type="email"
                  placeholder={currentConfig.emailPlaceholder} 
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
                boxShadow: selectedRole === 'expert'
                  ? '0 8px 20px rgba(168, 85, 247, 0.25)'
                  : '0 8px 20px rgba(79, 70, 229, 0.25)',
                background: selectedRole === 'expert'
                  ? 'linear-gradient(135deg, #9333ea, #6366f1)'
                  : undefined,
                marginTop: '0.5rem',
                transition: 'all 0.2s ease'
              }}
              disabled={loading}
            >
              {loading ? (
                'Signing in...'
              ) : (
                <>
                  <span>
                    {selectedRole === 'expert' 
                      ? 'Sign In as Specialist' 
                      : 'Sign In as Student'
                    }
                  </span>
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
            {currentConfig.registerText}{' '}
            {currentConfig.registerLink ? (
              <Link 
                to={currentConfig.registerLink} 
                style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none', marginLeft: '0.25rem' }}
              >
                {currentConfig.registerAction}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => handleRoleSelect('user')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  marginLeft: '0.25rem',
                  fontSize: '0.875rem'
                }}
              >
                {currentConfig.registerAction}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
