import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  CalendarRange, 
  CalendarPlus,
  PackagePlus, 
  User, 
  LogOut, 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  Briefcase,
  UserCheck,
  Wallet,
  Bell,
  Sparkles,
  HelpCircle,
  Plus
} from 'lucide-react';
import WalletModal from './WalletModal';
import axios from 'axios';

import { API_URL } from '../config/api';

const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(user?.walletBalance || 0);

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWallet();
      fetchNotifications();
    }
  }, [user]);

  const fetchWallet = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/wallet`);
      if (res.data.success) {
        setWalletBalance(res.data.data.walletBalance);
      }
    } catch (err) {
      console.error('Error fetching wallet in topbar', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_URL}/notifications`);
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.error('Error fetching notifications', err);
    }
  };

  const toggleNotifications = () => {
    setIsNotifOpen(!isNotifOpen);
    if (!isNotifOpen) {
      fetchNotifications();
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await axios.patch(`${API_URL}/notifications/read-all`);
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking notifications as read', err);
    }
  };

  if (!user) return <>{children}</>;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define full left-side navigation items
  const getNavItems = () => {
    if (user.role === 'admin') {
      return [
        { name: 'Global Bookings', path: '/admin?tab=appointments', tab: 'appointments', icon: <CalendarRange size={18} /> },
        { name: 'Platform Services', path: '/admin?tab=services', tab: 'services', icon: <PackagePlus size={18} /> },
        { name: 'Services & Experts', path: '/services', icon: <UserCheck size={18} /> },
        { name: 'Admin Settings', path: '/admin?tab=profile', tab: 'profile', icon: <Shield size={18} /> },
      ];
    } else if (['expert', 'stylist'].includes(user.role)) {
      return [
        { name: 'My Schedule', path: '/expert?tab=appointments', tab: 'appointments', icon: <CalendarRange size={18} /> },
        { name: 'My Services', path: '/expert?tab=services', tab: 'services', icon: <Briefcase size={18} /> },
        { name: 'Services & Experts', path: '/services', icon: <UserCheck size={18} /> },
        { name: 'Profile Settings', path: '/expert?tab=profile', tab: 'profile', icon: <User size={18} /> },
      ];
    } else {
      // Customer / Student navigation
      return [
        { name: 'Dashboard Overview', path: '/dashboard?tab=overview', tab: 'overview', icon: <LayoutDashboard size={18} /> },
        { name: 'Book Appointment', path: '/book', icon: <CalendarPlus size={18} /> },
        { name: 'Campus Stylists', path: '/services', icon: <Sparkles size={18} /> },
        { name: 'Student Wallet', action: 'wallet', icon: <Wallet size={18} />, badge: `₦${walletBalance.toLocaleString()}` },
        { name: 'Profile & Settings', path: '/dashboard?tab=profile', tab: 'profile', icon: <User size={18} /> },
        { name: 'Campus Support', path: '/contact', icon: <HelpCircle size={18} /> },
      ];
    }
  };

  const navItems = getNavItems();

  const getWorkspaceTitle = () => {
    if (user.role === 'admin') return 'System Console';
    if (['expert', 'stylist'].includes(user.role)) return 'Expert Workspace';
    return 'Customer Dashboard';
  };

  const getRoleBadgeColor = () => {
    if (user.role === 'admin') return 'rgba(239, 68, 68, 0.12)';
    if (['expert', 'stylist'].includes(user.role)) return 'rgba(168, 85, 247, 0.12)';
    return 'rgba(99, 102, 241, 0.12)';
  };

  const getRoleTextColor = () => {
    if (user.role === 'admin') return '#f87171';
    if (['expert', 'stylist'].includes(user.role)) return '#c084fc';
    return '#818cf8';
  };

  // Check active tab via search query parameter
  const checkActive = (item, idx) => {
    if (item.action === 'wallet') return false;
    const params = new URLSearchParams(location.search);
    const currentTab = params.get('tab');
    
    // Exact path match
    const basePath = item.path?.split('?')[0];
    if (location.pathname !== basePath) return false;

    // Tab parameter match
    if (currentTab) {
      return item.tab === currentTab;
    }

    return idx === 0;
  };

  return (
    <div className="app-shell-container">
      {/* Sidebar for Desktop */}
      <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand-wrapper">
          <Link to="/" className="sidebar-brand-link">
            <img 
              src="/logo-sm.png" 
              alt="D.WORLD Logo" 
              width="34"
              height="34"
              loading="eager"
              decoding="async"
              style={{ 
                width: 34, 
                height: 34, 
                borderRadius: 10, 
                objectFit: 'cover', 
                flexShrink: 0, 
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                transform: 'translateZ(0)',
                willChange: 'transform'
              }} 
            />
            {!collapsed && (
              <div>
                <span className="brand-text">D.WORLD</span>
                <span className="brand-subtext">LCU Campus</span>
              </div>
            )}
          </Link>
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Expand menu" : "Collapse menu"}>
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* User Profile Card */}
        <div className="user-profile-summary">
          <div className="user-avatar-circle">
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          {!collapsed && (
            <div className="user-details">
              <span className="user-name-label">{user.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span className="user-role-label" style={{ backgroundColor: getRoleBadgeColor(), color: getRoleTextColor() }}>
                  {user.role === 'user' ? 'STUDENT' : user.role.toUpperCase()}
                </span>
                {user.matricNo && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {user.matricNo}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Wallet Widget in Sidebar */}
        {!collapsed && user.role === 'user' && (
          <div className="sidebar-wallet-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>CAMPUS WALLET</span>
              <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700 }}>● Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>
                ₦{walletBalance.toLocaleString()}
              </strong>
              <button 
                type="button"
                onClick={() => setIsWalletOpen(true)}
                className="sidebar-topup-btn"
                title="Top up wallet balance"
              >
                <Plus size={12} /> Top Up
              </button>
            </div>
          </div>
        )}

        {/* Full Navigation List */}
        <nav className="sidebar-nav">
          <div className="nav-group-title">{!collapsed && 'MENU NAVIGATION'}</div>
          {navItems.map((item, idx) => {
            const isActive = checkActive(item, idx);
            if (item.action === 'wallet') {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setIsWalletOpen(true)}
                  className="sidebar-nav-item"
                  style={{ width: '100%', textAlign: 'left', background: 'transparent', cursor: 'pointer' }}
                >
                  <div className="nav-item-icon">{item.icon}</div>
                  {!collapsed && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span className="nav-item-label">{item.name}</span>
                      {item.badge && <span className="nav-badge-pill">{item.badge}</span>}
                    </div>
                  )}
                </button>
              );
            }

            return (
              <Link 
                key={idx}
                to={item.path}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <div className="nav-item-icon">{item.icon}</div>
                {!collapsed && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span className="nav-item-label">{item.name}</span>
                    {item.badge && <span className="nav-badge-pill">{item.badge}</span>}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer with Sign Out */}
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="sidebar-logout-btn">
            <LogOut size={18} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Topbar and Content Panel */}
      <div className="app-main-panel">
        <header className="app-topbar">
          <button 
            type="button"
            className="mobile-menu-toggle" 
            onClick={() => setMobileOpen(true)}
            aria-label="Open Left Navigation Menu"
          >
            <Menu size={20} />
            <span style={{ fontSize: '0.825rem', fontWeight: 700 }}>Menu</span>
          </button>

          <div className="topbar-title-wrapper">
            <h2>{getWorkspaceTitle()}</h2>
          </div>

          <div className="topbar-actions-wrapper">
            <button 
              onClick={() => setIsWalletOpen(true)}
              style={{
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                color: 'white',
                border: 'none',
                padding: '0.45rem 0.9rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
              }}
            >
              <Wallet size={16} /> <span>₦{walletBalance.toLocaleString()}</span>
            </button>

            {/* Notification Bell Button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={toggleNotifications}
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border-light)',
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                  position: 'relative'
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Drawer */}
              {isNotifOpen && (
                <>
                  <div 
                    onClick={() => setIsNotifOpen(false)} 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2400 }}
                  />
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '46px',
                    width: 'min(330px, 86vw)',
                    background: '#ffffff',
                    border: '1px solid var(--border-light)',
                    borderRadius: '16px',
                    boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.25)',
                    zIndex: 2550,
                    padding: '1rem',
                    overflow: 'hidden'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>Notifications</strong>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
                      {notifications.length > 0 ? (
                        notifications.map(notif => (
                          <div key={notif._id} style={{
                            padding: '0.65rem 0.75rem',
                            borderRadius: '10px',
                            background: notif.read ? '#f8fafc' : 'rgba(79, 70, 229, 0.06)',
                            border: notif.read ? '1px solid var(--border-light)' : '1px solid rgba(79, 70, 229, 0.2)'
                          }}>
                            <strong style={{ fontSize: '0.825rem', color: 'var(--text-main)', display: 'block' }}>{notif.title}</strong>
                            <p style={{ margin: '0.15rem 0 0', fontSize: '0.775rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{notif.message}</p>
                            <span style={{ fontSize: '0.675rem', color: 'var(--text-subtle)', display: 'block', marginTop: '0.35rem' }}>
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.8rem' }}>
                          No new notifications
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="topbar-divider desktop-only"></div>
            <span className="topbar-welcome desktop-only">Logged in: <strong>{user.name || user.email}</strong></span>

            {/* VISIBLE LOGOUT BUTTON */}
            <button
              type="button"
              onClick={handleLogout}
              className="topbar-logout-btn"
              title="Sign Out of Account"
            >
              <LogOut size={16} />
              <span className="logout-text">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Wallet Modal */}
        <WalletModal 
          isOpen={isWalletOpen}
          onClose={() => setIsWalletOpen(false)}
          onWalletUpdated={(newBal) => setWalletBalance(newBal)}
        />

        <main className="app-workspace-content">
          {children}
        </main>
      </div>

      {/* Mobile Drawer Left-Side Navigation (Replaces Bottom Panel) */}
      {mobileOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMobileOpen(false)}>
          <aside className="mobile-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-brand-wrapper">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <img 
                  src="/logo-sm.png" 
                  alt="D.WORLD Logo" 
                  width="34"
                  height="34"
                  loading="eager"
                  decoding="async"
                  style={{ 
                    width: 34, 
                    height: 34, 
                    borderRadius: 10, 
                    objectFit: 'cover', 
                    flexShrink: 0, 
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                    transform: 'translateZ(0)',
                    willChange: 'transform'
                  }} 
                />
                <div>
                  <span className="brand-text">D.WORLD</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>LCU Campus</span>
                </div>
              </div>
              <button className="mobile-close-btn" onClick={() => setMobileOpen(false)} aria-label="Close Navigation">
                <X size={22} />
              </button>
            </div>
            
            {/* Mobile User Profile Summary */}
            <div className="user-profile-summary">
              <div className="user-avatar-circle">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="user-details">
                <span className="user-name-label">{user.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span className="user-role-label" style={{ backgroundColor: getRoleBadgeColor(), color: getRoleTextColor() }}>
                    {user.role === 'user' ? 'STUDENT' : user.role.toUpperCase()}
                  </span>
                  {user.matricNo && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {user.matricNo}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Wallet Quick Top-Up Card */}
            {user.role === 'user' && (
              <div className="sidebar-wallet-card" style={{ margin: '1rem 1.25rem 0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>CAMPUS WALLET</span>
                  <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700 }}>● Active</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>
                    ₦{walletBalance.toLocaleString()}
                  </strong>
                  <button 
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      setIsWalletOpen(true);
                    }}
                    className="sidebar-topup-btn"
                  >
                    <Plus size={12} /> Top Up
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Navigation List */}
            <nav className="sidebar-nav" style={{ padding: '1rem 1rem' }}>
              <div className="nav-group-title">MENU NAVIGATION</div>
              {navItems.map((item, idx) => {
                const isActive = checkActive(item, idx);
                if (item.action === 'wallet') {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        setIsWalletOpen(true);
                      }}
                      className="sidebar-nav-item"
                      style={{ width: '100%', textAlign: 'left', background: 'transparent', cursor: 'pointer' }}
                    >
                      <div className="nav-item-icon">{item.icon}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span className="nav-item-label">{item.name}</span>
                        {item.badge && <span className="nav-badge-pill">{item.badge}</span>}
                      </div>
                    </button>
                  );
                }

                return (
                  <Link 
                    key={idx}
                    to={item.path}
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <div className="nav-item-icon">{item.icon}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span className="nav-item-label">{item.name}</span>
                      {item.badge && <span className="nav-badge-pill">{item.badge}</span>}
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="mobile-sidebar-footer">
              <button onClick={handleLogout} className="sidebar-logout-btn" style={{ width: '100%' }}>
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Styled Block for AppShell Layout */}
      <style>{`
        .app-shell-container {
          display: flex;
          min-height: 100vh;
          background: var(--bg-main);
          color: var(--text-main);
        }

        /* --- Sidebar Styling --- */
        .app-sidebar {
          width: 260px;
          background: var(--nav-bg);
          border-right: 1px solid var(--border-light);
          display: flex;
          flex-direction: column;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: sticky;
          top: 0;
          height: 100vh;
          z-index: 100;
        }

        .app-sidebar.collapsed {
          width: 76px;
        }

        .sidebar-brand-wrapper {
          padding: 1.5rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-light);
        }

        .sidebar-brand-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          color: var(--text-main);
        }

        .brand-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--primary);
          box-shadow: 0 0 10px var(--primary);
        }

        .brand-text {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 1.25rem;
          letter-spacing: -0.02em;
          color: var(--text-main);
        }

        .collapse-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-light);
          color: var(--text-muted);
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .collapse-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-main);
        }

        .user-profile-summary {
          padding: 1.5rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-bottom: 1px solid var(--border-light);
        }

        .user-avatar-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2);
        }

        .user-details {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          overflow: hidden;
        }

        .user-name-label {
          font-size: 0.9rem;
          font-weight: 600;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .user-role-label {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          align-self: flex-start;
          letter-spacing: 0.05em;
        }

        .sidebar-nav {
          padding: 1.5rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          flex-grow: 1;
        }

        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.7rem 0.75rem;
          color: var(--text-muted);
          text-decoration: none;
          border-radius: 8px;
          font-size: 0.925rem;
          font-weight: 500;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }

        .sidebar-nav-item:hover {
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-main);
        }

        .sidebar-nav-item.active {
          background: rgba(99, 102, 241, 0.08);
          color: var(--primary);
          border-color: rgba(99, 102, 241, 0.2);
        }

        .nav-item-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sidebar-footer {
          padding: 1.25rem 0.75rem;
          border-top: 1px solid var(--border-light);
        }

        .sidebar-logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.7rem 0.75rem;
          background: transparent;
          border: none;
          color: #ef4444;
          font-size: 0.925rem;
          font-weight: 500;
          cursor: pointer;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .sidebar-logout-btn:hover {
          background: rgba(239, 68, 68, 0.08);
        }

        /* --- Topbar & Workspace --- */
        .app-main-panel {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .app-topbar {
          height: 65px;
          background: var(--nav-bg);
          border-bottom: 1px solid var(--border-light);
          padding: 0 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 90;
        }

        .mobile-menu-toggle {
          display: none;
          background: transparent;
          border: none;
          color: var(--text-main);
          cursor: pointer;
        }

        .topbar-title-wrapper h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .topbar-actions-wrapper {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .system-status-pill {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.15);
          padding: 0.3rem 0.6rem;
          border-radius: 9999px;
        }

        .pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--success);
          animation: status-pulse 2s infinite;
        }

        .status-label {
          font-size: 0.75rem;
          color: var(--success);
          font-weight: 600;
        }

        .topbar-divider {
          width: 1px;
          height: 20px;
          background: var(--border-light);
        }

        .topbar-welcome {
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .app-workspace-content {
          padding: 2rem;
          flex-grow: 1;
          overflow-y: auto;
        }

        @keyframes status-pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .topbar-actions-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .topbar-wallet-pill {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          border: none;
          padding: 0.45rem 0.85rem;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
          transition: transform 0.15s ease;
        }

        .topbar-wallet-pill:active {
          transform: scale(0.96);
        }

        .topbar-icon-btn {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-light);
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-main);
          position: relative;
          transition: all 0.2s;
        }

        .topbar-icon-btn:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .notif-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          font-size: 0.65rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notif-dropdown {
          position: absolute;
          right: 0;
          top: 46px;
          width: min(340px, 88vw);
          background: var(--nav-bg);
          border: 1px solid var(--border-light);
          border-radius: 16px;
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.4);
          z-index: 2550;
          padding: 1rem;
          overflow: hidden;
        }

        .topbar-logout-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.8rem;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.28);
          color: #ef4444;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .topbar-logout-btn:hover {
          background: rgba(239, 68, 68, 0.22);
          border-color: rgba(239, 68, 68, 0.45);
          color: #f87171;
        }

        .desktop-only {
          display: flex;
          align-items: center;
        }

        .mobile-menu-toggle {
          display: none;
          align-items: center;
          gap: 0.45rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-light);
          padding: 0.45rem 0.75rem;
          border-radius: 10px;
          color: var(--text-main);
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .mobile-menu-toggle:active {
          background: rgba(255, 255, 255, 0.1);
        }

        .brand-subtext {
          font-size: 0.65rem;
          color: var(--text-muted);
          display: block;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: -2px;
        }

        .sidebar-wallet-card {
          margin: 1rem 1rem 0.5rem;
          padding: 0.85rem 1rem;
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(124, 58, 237, 0.12));
          border: 1px solid rgba(79, 70, 229, 0.25);
          border-radius: 12px;
        }

        .sidebar-topup-btn {
          background: var(--primary);
          color: white;
          border: none;
          padding: 0.3rem 0.65rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          transition: opacity 0.15s;
        }

        .sidebar-topup-btn:hover {
          opacity: 0.9;
        }

        .nav-group-title {
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: var(--text-subtle);
          padding: 0.5rem 0.75rem 0.25rem;
          text-transform: uppercase;
        }

        .nav-badge-pill {
          background: rgba(79, 70, 229, 0.12);
          color: var(--primary);
          font-size: 0.7rem;
          font-weight: 800;
          padding: 0.15rem 0.5rem;
          border-radius: 9999px;
          border: 1px solid rgba(79, 70, 229, 0.2);
        }

        /* --- Responsive Styles --- */
        @media (max-width: 992px) {
          .app-sidebar {
            display: none !important;
          }

          .mobile-menu-toggle {
            display: inline-flex !important;
          }

          .desktop-only {
            display: none !important;
          }

          .app-topbar {
            padding: 0 1rem;
            height: 60px;
          }

          .app-workspace-content {
            padding: 1.25rem 1rem;
          }

          .topbar-actions-wrapper {
            gap: 0.5rem;
          }
        }

        @media (max-width: 768px) {
          .topbar-logout-btn .logout-text {
            display: none;
          }

          .topbar-logout-btn {
            padding: 0.45rem;
            width: 36px;
            height: 36px;
            justify-content: center;
          }
        }

        /* --- Mobile Overlay Navigation (Left Drawer) --- */
        .mobile-nav-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          z-index: 2600;
          display: flex;
        }

        .mobile-sidebar {
          width: 300px;
          max-width: 85vw;
          height: 100vh;
          background: var(--nav-bg);
          border-right: 1px solid var(--border-light);
          display: flex;
          flex-direction: column;
          animation: slide-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 10px 0 35px rgba(0, 0, 0, 0.5);
          overflow-y: auto;
        }

        .mobile-brand-wrapper {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-light);
        }

        .mobile-close-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-light);
          color: var(--text-muted);
          width: 34px;
          height: 34px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .mobile-close-btn:hover {
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.1);
        }

        .mobile-sidebar-footer {
          padding: 1.25rem 1.5rem;
          border-top: 1px solid var(--border-light);
          margin-top: auto;
        }

        @keyframes slide-in {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default AppLayout;
