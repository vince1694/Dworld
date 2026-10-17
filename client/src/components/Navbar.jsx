import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Menu, X, Bell } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hide global navbar on dashboard, book appointment, and admin portal pages
  const isExcludedRoute = ['/dashboard', '/expert', '/admin', '/book'].some(prefix => location.pathname.startsWith(prefix));
  if (isExcludedRoute) return null;

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Services & Experts', path: '/services' },
    { name: 'Contact', path: '/contact' }
  ];

  const getDashboardPath = () => {
    if (!user) return '/';
    if (user.role === 'admin') return '/admin';
    if (['expert', 'stylist'].includes(user.role)) return '/expert';
    return '/dashboard';
  };

  const getDashboardName = () => {
    if (!user) return '';
    if (user.role === 'admin') return 'Admin System';
    if (['expert', 'stylist'].includes(user.role)) return 'Expert Dash';
    return 'Dashboard';
  };

  return (
    <nav style={{
      padding: '0.75rem 5%',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'var(--nav-bg)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      borderBottom: '1px solid var(--border-light)'
    }}>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <div style={{
          fontSize: '1.4rem',
          fontWeight: 900,
          color: 'var(--text-main)',
          letterSpacing: '-0.02em',
          fontFamily: 'Outfit, sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></span>
          D.WORLD
        </div>
      </Link>

      {/* Desktop Navigation */}
      <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        {navLinks.map((link) => (
          <Link 
            key={link.path} 
            to={link.path} 
            className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
          >
            {link.name}
          </Link>
        ))}
        
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingLeft: '1rem', borderLeft: '1px solid var(--border-light)' }}>
            <Link 
              to={getDashboardPath()} 
              className={`nav-link ${location.pathname === getDashboardPath() ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <LayoutDashboard size={18} />
              {getDashboardName()}
            </Link>
            <button 
              onClick={handleLogout} 
              className="btn btn-outline" 
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', paddingLeft: '1rem', borderLeft: '1px solid var(--border-light)' }}>
            <Link to="/login" className="btn btn-outline">Log in</Link>
            <Link to="/register" className="btn btn-primary">Sign up</Link>
          </div>
        )}
      </div>

      {/* Mobile Menu Toggle */}
      <div className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        {mobileMenuOpen ? <X size={24} color="var(--text-main)" /> : <Menu size={24} color="var(--text-main)" />}
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="mobile-nav">
          {navLinks.map((link) => (
            <Link 
              key={link.path} 
              to={link.path} 
              className={`mobile-nav-link ${location.pathname === link.path ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          
          <div style={{ borderTop: '1px solid var(--border-light)', margin: '1rem 0', paddingTop: '1rem' }}>
            {user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Link 
                  to={getDashboardPath()} 
                  className={`mobile-nav-link ${location.pathname === getDashboardPath() ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <LayoutDashboard size={18} />
                  {getDashboardName()}
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="btn btn-outline" 
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link to="/login" className="btn btn-outline" onClick={() => setMobileMenuOpen(false)} style={{ justifyContent: 'center' }}>Log in</Link>
                <Link to="/register" className="btn btn-primary" onClick={() => setMobileMenuOpen(false)} style={{ justifyContent: 'center' }}>Sign up</Link>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .nav-link {
          color: var(--text-muted);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.95rem;
          transition: color 0.2s ease;
          font-family: 'Inter', sans-serif;
        }
        .nav-link:hover, .nav-link.active {
          color: var(--text-main);
        }
        
        .mobile-toggle {
          display: none;
          cursor: pointer;
        }

        .mobile-nav {
          position: absolute;
          top: 100%;
          left: 0;
          width: 100%;
          background: var(--nav-bg);
          padding: 1.5rem 5%;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          border-bottom: 1px solid var(--border-light);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
        }

        .mobile-nav-link {
          color: var(--text-muted);
          text-decoration: none;
          font-weight: 500;
          font-size: 1.05rem;
          padding: 0.5rem 0;
        }
        
        .mobile-nav-link.active {
          color: var(--primary);
        }

        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-toggle {
            display: block;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
