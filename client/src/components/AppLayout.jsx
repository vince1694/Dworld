import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  CalendarRange, 
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
  Bell
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

  // Define sidebar links with query params
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
      // Customer
      return [
        { name: 'Dashboard', path: '/dashboard?tab=overview', tab: 'overview', icon: <LayoutDashboard size={18} /> },
        { name: 'Book Appointment', path: '/book', icon: <CalendarRange size={18} /> },
        { name: 'Services & Experts', path: '/services', icon: <UserCheck size={18} /> },
        { name: 'Profile Settings', path: '/dashboard?tab=profile', tab: 'profile', icon: <User size={18} /> },
      ];
    }
  };

  const navItems = getNavItems();

  const getWorkspaceTitle = () => {
    if (user.role === 'admin') return 'System Console';
    if (['expert', 'stylist'].includes(user.role)) return 'Expert Workspace';
    return 'Client Dashboard';
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
    const params = new URLSearchParams(location.search);
    const currentTab = params.get('tab');
    
    // Exact path match
    const basePath = item.path.split('?')[0];
    if (location.pathname !== basePath) return false;

    // Tab parameter match
    if (currentTab) {
      return item.tab === currentTab;
    }

    // Default to first item if no tab query is present
    return idx === 0;
  };

  return (
    <div className="app-shell-container">
      {/* Sidebar for Desktop */}
      <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand-wrapper">
          <Link to="/" className="sidebar-brand-link">
            <span className="brand-dot"></span>
            {!collapsed && <span className="brand-text">D.WORLD</span>}
          </Link>
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <div className="user-profile-summary">
          <div className="user-avatar-circle">
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          {!collapsed && (
            <div className="user-details">
              <span className="user-name-label">{user.name}</span>
              <span className="user-role-label" style={{ backgroundColor: getRoleBadgeColor(), color: getRoleTextColor() }}>
                {user.role.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, idx) => {
            const isActive = checkActive(item, idx);
            return (
              <Link 
                key={idx}
                to={item.path}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <div className="nav-item-icon">{item.icon}</div>
                {!collapsed && <span className="nav-item-label">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

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
          <button className="mobile-menu-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
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
                padding: '0.4rem 0.85rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
              }}
            >
              <Wallet size={16} /> Wallet: ₦{walletBalance.toLocaleString()}
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
                  {/* Transparent click backdrop for mobile/desktop */}
                  <div 
                    onClick={() => setIsNotifOpen(false)} 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zindex: 2400 }}
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
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>Activity Notifications</strong>
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

            <div className="system-status-pill desktop-only">
              <span className="pulse-dot"></span>
              <span className="status-label">Operational</span>
            </div>
            <div className="topbar-divider desktop-only"></div>
            <span className="topbar-welcome desktop-only">Logged in: <strong>{user.email}</strong></span>

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

      {/* Mobile Drawer Navigation */}
      {mobileOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMobileOpen(false)}>
          <aside className="mobile-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-brand-wrapper">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="brand-dot"></span>
                <span className="brand-text">D.WORLD</span>
              </div>
              <button className="mobile-close-btn" onClick={() => setMobileOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <nav className="sidebar-nav" style={{ padding: '2rem 1.5rem' }}>
              {navItems.map((item, idx) => {
                const isActive = checkActive(item, idx);
                return (
                  <Link 
                    key={idx}
                    to={item.path}
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <div className="nav-item-icon">{item.icon}</div>
                    <span className="nav-item-label">{item.name}</span>
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

      {/* Mobile Bottom Dock for Native-like Navigation */}
      <nav className="mobile-bottom-dock">
        {navItems.map((item, idx) => {
          const isActive = checkActive(item, idx);
          return (
            <Link 
              key={idx}
              to={item.path}
              className={`bottom-dock-item ${isActive ? 'active' : ''}`}
            >
              <div className="dock-icon-wrapper">
                {item.icon}
              </div>
              <span className="dock-label">{item.name.split(' ')[0]}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setIsWalletOpen(true)}
          className="bottom-dock-item"
        >
          <div className="dock-icon-wrapper">
            <Wallet size={18} />
          </div>
          <span className="dock-label">Wallet</span>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="bottom-dock-item"
          style={{ color: '#ef4444' }}
        >
          <div className="dock-icon-wrapper" style={{ color: '#ef4444' }}>
            <LogOut size={18} />
          </div>
          <span className="dock-label" style={{ color: '#ef4444', fontWeight: 700 }}>Exit</span>
        </button>
      </nav>

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

        .mobile-bottom-dock {
          display: none;
        }

        /* --- Responsive Styles --- */
        @media (max-width: 992px) {
          .app-sidebar {
            display: none;
          }

          .mobile-menu-toggle {
            display: block;
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

          .wallet-label-full {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .mobile-bottom-dock {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 62px;
            background: var(--nav-bg);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-top: 1px solid var(--border-light);
            justify-content: space-around;
            align-items: center;
            z-index: 999;
            padding: 0 0.5rem;
            padding-bottom: env(safe-area-inset-bottom, 0px);
            box-shadow: 0 -4px 25px rgba(0, 0, 0, 0.2);
          }

          .app-workspace-content {
            padding-bottom: 5.5rem !important;
          }

          .bottom-dock-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.2rem;
            color: var(--text-muted);
            text-decoration: none;
            font-size: 0.68rem;
            font-weight: 600;
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 0.25rem 0.5rem;
            border-radius: 8px;
            transition: color 0.15s;
          }

          .bottom-dock-item.active {
            color: var(--primary);
            font-weight: 700;
          }

          .dock-icon-wrapper {
            padding: 0.15rem 0.5rem;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .bottom-dock-item.active .dock-icon-wrapper {
            background: rgba(99, 102, 241, 0.15);
          }

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

        /* --- Mobile Overlay Navigation --- */
        .mobile-nav-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          z-index: 1000;
        }

        .mobile-sidebar {
          width: 290px;
          height: 100vh;
          background: var(--nav-bg);
          border-right: 1px solid var(--border-light);
          display: flex;
          flex-direction: column;
          animation: slide-in 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .mobile-brand-wrapper {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-light);
        }

        .mobile-close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }

        .mobile-sidebar-footer {
          padding: 1.5rem;
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
