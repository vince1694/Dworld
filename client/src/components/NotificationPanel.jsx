import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  X, 
  CheckCheck, 
  Calendar, 
  CreditCard, 
  Star, 
  Sparkles, 
  Trash2, 
  ExternalLink,
  Check,
  Inbox
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const getNotificationIcon = (type = 'system') => {
  switch (type) {
    case 'booking':
      return {
        icon: <Calendar size={18} />,
        bg: 'rgba(99, 102, 241, 0.12)',
        color: '#6366f1',
        border: 'rgba(99, 102, 241, 0.25)'
      };
    case 'payment':
      return {
        icon: <CreditCard size={18} />,
        bg: 'rgba(16, 185, 129, 0.12)',
        color: '#10b981',
        border: 'rgba(16, 185, 129, 0.25)'
      };
    case 'review':
      return {
        icon: <Star size={18} />,
        bg: 'rgba(245, 158, 11, 0.12)',
        color: '#f59e0b',
        border: 'rgba(245, 158, 11, 0.25)'
      };
    default:
      return {
        icon: <Sparkles size={18} />,
        bg: 'rgba(168, 85, 247, 0.12)',
        color: '#a855f7',
        border: 'rgba(168, 85, 247, 0.25)'
      };
  }
};

const NotificationPanel = ({ 
  isOpen, 
  onClose, 
  notifications = [], 
  setNotifications, 
  user 
}) => {
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'booking', 'payment'
  const navigate = useNavigate();

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (filter === 'unread') return !n.read;
      if (filter === 'booking') return n.type === 'booking';
      if (filter === 'payment') return n.type === 'payment';
      return true;
    });
  }, [notifications, filter]);

  const handleMarkAllRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      await axios.patch(`${API_URL}/notifications/read-all`);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleMarkOneRead = async (e, notifId) => {
    e.stopPropagation();
    try {
      setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, read: true } : n));
      await axios.patch(`${API_URL}/notifications/${notifId}/read`);
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  const handleDeleteOne = async (e, notifId) => {
    e.stopPropagation();
    try {
      setNotifications(prev => prev.filter(n => n._id !== notifId));
      await axios.delete(`${API_URL}/notifications/${notifId}`);
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const handleClearAll = async () => {
    try {
      setNotifications([]);
      await axios.delete(`${API_URL}/notifications/clear-all`);
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.read) {
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
      axios.patch(`${API_URL}/notifications/${notif._id}/read`).catch(() => {});
    }

    onClose();

    // Smart context navigation
    if (notif.type === 'booking') {
      if (user?.role === 'expert' || user?.role === 'stylist') {
        navigate('/expert?tab=appointments');
      } else {
        navigate('/dashboard?tab=overview');
      }
    } else if (notif.type === 'payment') {
      if (user?.role === 'expert' || user?.role === 'stylist') {
        navigate('/expert?tab=wallet');
      } else {
        navigate('/dashboard?tab=wallet');
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2900,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'stretch'
          }}
        >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)'
          }}
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '430px',
            background: 'var(--surface, #ffffff)',
            borderLeft: '1px solid var(--border-light, #e2e8f0)',
            boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 3000,
            height: '100%'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-light, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--primary, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Bell size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>
                  Notifications
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
                  {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    color: 'var(--primary, #6366f1)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <CheckCheck size={14} />
                  <span>Read all</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close notification drawer"
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div style={{
            display: 'flex',
            gap: '0.4rem',
            padding: '0.75rem 1.5rem',
            background: '#f8fafc',
            borderBottom: '1px solid var(--border-light, #e2e8f0)',
            overflowX: 'auto',
            scrollbarWidth: 'none'
          }}>
            {[
              { id: 'all', label: `All (${notifications.length})` },
              { id: 'unread', label: `Unread (${unreadCount})` },
              { id: 'booking', label: 'Bookings' },
              { id: 'payment', label: 'Payments' }
            ].map(tab => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '9999px',
                    border: active ? '1px solid var(--primary, #6366f1)' : '1px solid #e2e8f0',
                    background: active ? 'var(--primary, #6366f1)' : '#ffffff',
                    color: active ? '#ffffff' : '#64748b',
                    fontSize: '0.75rem',
                    fontWeight: active ? 700 : 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Notification List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notif) => {
                const style = getNotificationIcon(notif.type);
                return (
                  <motion.div
                    key={notif._id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.85rem',
                      padding: '0.9rem 1rem',
                      borderRadius: '14px',
                      background: notif.read ? '#ffffff' : 'rgba(99, 102, 241, 0.05)',
                      border: notif.read ? '1px solid #f1f5f9' : '1.5px solid rgba(99, 102, 241, 0.25)',
                      boxShadow: notif.read ? '0 1px 3px rgba(0,0,0,0.02)' : '0 4px 12px rgba(99, 102, 241, 0.08)',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: '10px',
                      background: style.bg,
                      color: style.color,
                      border: `1px solid ${style.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {style.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <strong style={{
                          fontSize: '0.875rem',
                          color: 'var(--text-main, #0f172a)',
                          fontWeight: notif.read ? 600 : 800,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {notif.title}
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>

                      <p style={{
                        margin: 0,
                        fontSize: '0.8rem',
                        color: 'var(--text-muted, #64748b)',
                        lineHeight: 1.45,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {notif.message}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignSelf: 'center', marginLeft: '0.25rem' }}
                    >
                      {!notif.read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkOneRead(e, notif._id)}
                          title="Mark as read"
                          style={{
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '6px',
                            width: 26,
                            height: 26,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6366f1',
                            cursor: 'pointer'
                          }}
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteOne(e, notif._id)}
                        title="Delete notification"
                        style={{
                          background: '#f8fafc',
                          border: 'none',
                          borderRadius: '6px',
                          width: 26,
                          height: 26,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94a3b8',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '4rem 1.5rem',
                color: '#94a3b8'
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem'
                }}>
                  <Inbox size={26} />
                </div>
                <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem', color: 'var(--text-main, #0f172a)' }}>
                  {filter === 'unread' ? 'No unread alerts' : 'No notifications yet'}
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                  {filter === 'unread' ? 'You have read all your updates.' : 'Booking updates and transaction receipts will appear here.'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '0.85rem 1.5rem',
              borderTop: '1px solid var(--border-light, #e2e8f0)',
              background: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {notifications.length} total notifications
              </span>
              <button
                type="button"
                onClick={handleClearAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Trash2 size={14} /> Clear all
              </button>
            </div>
          )}
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;
