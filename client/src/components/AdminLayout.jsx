import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, 
  CalendarRange, 
  PackagePlus, 
  User, 
  LogOut, 
  Menu, 
  X, 
  Globe,
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const navItems = [
    { name: 'Global Bookings', path: '/admin?tab=appointments', tab: 'appointments', icon: <CalendarRange size={18} /> },
    { name: 'Platform Services', path: '/admin?tab=services', tab: 'services', icon: <PackagePlus size={18} /> },
    { name: 'Admin Profile', path: '/admin?tab=profile', tab: 'profile', icon: <User size={18} /> },
  ];

  const currentTab = new URLSearchParams(location.search).get('tab') || 'appointments';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#090d16',
      color: '#f3f4f6',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Admin Top Command Bar */}
      <header style={{
        height: '64px',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        {/* Left Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer'
            }}
            className="admin-mobile-toggle"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
            }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <div style={{
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 900,
                fontSize: '1.15rem',
                color: '#fff',
                letterSpacing: '-0.02em',
                lineHeight: 1.1
              }}>
                D.WORLD <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 700 }}>ADMIN</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Operations Control Console
              </div>
            </div>
          </Link>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#34d399',
            fontSize: '0.725rem',
            fontWeight: 600,
            marginLeft: '0.75rem'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            Node LCU-01 Live
          </div>
        </div>

        {/* Right Admin Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right', display: 'none' }} className="admin-user-info">
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f3f4f6' }}>{user?.name || 'Super Admin'}</div>
            <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>SYSTEM ADMINISTRATOR</div>
          </div>

          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#d1d5db',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: 500,
              transition: 'background 0.2s'
            }}
            title="Open public website in new tab"
          >
            <Globe size={14} /> Public Website
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <LogOut size={14} /> Disconnect
          </button>
        </div>
      </header>

      {/* Main Content Area with Sidebar */}
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 64px)' }}>
        {/* Sidebar */}
        <aside style={{
          width: '240px',
          background: 'rgba(15, 23, 42, 0.65)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem 1rem',
          gap: '0.5rem',
          flexShrink: 0
        }}>
          <div style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '0 0.75rem 0.5rem'
          }}>
            Administration
          </div>

          {navItems.map((item) => {
            const isActive = currentTab === item.tab;
            return (
              <Link
                key={item.tab}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 0.85rem',
                  borderRadius: '10px',
                  color: isActive ? '#fff' : '#9ca3af',
                  background: isActive ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.08) 100%)' : 'transparent',
                  border: isActive ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid transparent',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ color: isActive ? '#ef4444' : '#9ca3af' }}>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}

          <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '12px',
              padding: '0.85rem',
              fontSize: '0.75rem',
              color: '#9ca3af'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f3f4f6', fontWeight: 600, marginBottom: '0.25rem' }}>
                <Activity size={14} color="#10b981" /> 10% Cut Active
              </div>
              <div>Platform revenue fee automatically deducted on service bookings.</div>
            </div>
          </div>
        </aside>

        {/* Content View */}
        <main style={{
          flex: 1,
          padding: '2rem',
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
          overflowX: 'auto'
        }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .admin-user-info { display: block !important; }
        }
        @media (max-width: 768px) {
          .admin-mobile-toggle { display: inline-flex !important; }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;
