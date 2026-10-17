import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

// Single Toast Item with auto-dismiss progress bar
const ToastItem = ({ toast, onRemove }) => {
  const { id, message, type = 'info', duration = 4500 } = toast;

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onRemove]);

  const config = {
    success: {
      border: 'rgba(16, 185, 129, 0.35)',
      glow: '0 10px 30px -5px rgba(16, 185, 129, 0.25)',
      icon: <CheckCircle2 size={18} color="#10b981" />,
      barColor: '#10b981',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeColor: '#34d399',
      badgeText: 'Success'
    },
    error: {
      border: 'rgba(239, 68, 68, 0.35)',
      glow: '0 10px 30px -5px rgba(239, 68, 68, 0.25)',
      icon: <AlertCircle size={18} color="#ef4444" />,
      barColor: '#ef4444',
      badgeBg: 'rgba(239, 68, 68, 0.15)',
      badgeColor: '#f87171',
      badgeText: 'Notice'
    },
    warning: {
      border: 'rgba(245, 158, 11, 0.35)',
      glow: '0 10px 30px -5px rgba(245, 158, 11, 0.25)',
      icon: <AlertTriangle size={18} color="#f59e0b" />,
      barColor: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      badgeColor: '#fbbf24',
      badgeText: 'Warning'
    },
    info: {
      border: 'rgba(99, 102, 241, 0.35)',
      glow: '0 10px 30px -5px rgba(99, 102, 241, 0.25)',
      icon: <Info size={18} color="#6366f1" />,
      barColor: '#6366f1',
      badgeBg: 'rgba(99, 102, 241, 0.15)',
      badgeColor: '#818cf8',
      badgeText: 'Info'
    }
  }[type] || {
    border: 'rgba(255, 255, 255, 0.15)',
    glow: '0 10px 25px rgba(0,0,0,0.5)',
    icon: <Info size={18} color="#94a3b8" />,
    barColor: '#94a3b8',
    badgeBg: 'rgba(255,255,255,0.08)',
    badgeColor: '#cbd5e1',
    badgeText: 'Notice'
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.92, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
      style={{
        pointerEvents: 'auto',
        position: 'relative',
        overflow: 'hidden',
        background: 'rgba(15, 23, 42, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${config.border}`,
        boxShadow: config.glow,
        borderRadius: '16px',
        padding: '0.85rem 1rem 0.95rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
        color: '#f8fafc',
        width: '100%',
        maxWidth: '380px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            borderRadius: '8px',
            background: config.badgeBg
          }}>
            {config.icon}
          </div>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: config.badgeColor
          }}>
            {config.badgeText}
          </span>
        </div>

        <button
          onClick={() => onRemove(id)}
          aria-label="Close notification"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.45)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)'}
        >
          <X size={15} />
        </button>
      </div>

      <div style={{ fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.45, color: '#e2e8f0', paddingRight: '0.5rem' }}>
        {message}
      </div>

      {/* Countdown progress bar */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '3px',
          background: config.barColor,
          opacity: 0.8
        }}
      />
    </motion.div>
  );
};

// Confirm Modal Component
const ConfirmModal = ({ modal }) => {
  if (!modal) return null;

  const { title, message, confirmText, cancelText, onConfirm, onCancel, type } = modal;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.72)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 12 }}
        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
        style={{
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          padding: '1.75rem',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8)',
          color: '#f8fafc',
          textAlign: 'center'
        }}
      >
        <div style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          margin: '0 auto 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
          color: type === 'error' ? '#ef4444' : '#6366f1'
        }}>
          {type === 'error' ? <AlertCircle size={28} /> : <Info size={28} />}
        </div>

        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'Outfit' }}>
          {title || 'Confirm Action'}
        </h3>
        <p style={{ margin: '0 0 1.5rem', fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.5 }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            type="button"
            style={{
              flex: 1,
              padding: '0.7rem 1.25rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'transparent',
              color: '#cbd5e1',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            type="button"
            style={{
              flex: 1,
              padding: '0.7rem 1.25rem',
              borderRadius: '12px',
              border: 'none',
              background: type === 'error' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #4f46e5, #4338ca)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: type === 'error' ? '0 4px 14px rgba(239, 68, 68, 0.35)' : '0 4px 14px rgba(79, 70, 229, 0.35)'
            }}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Global Notifications Host
const CleanNotification = ({ toasts = [], removeToast, confirmModal }) => {
  return (
    <>
      {/* Toast container floating at top-right on desktop, top-center on mobile */}
      <div
        style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 9998,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          maxWidth: '380px',
          width: 'calc(100% - 2.5rem)',
          pointerEvents: 'none'
        }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </AnimatePresence>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && <ConfirmModal modal={confirmModal} />}
      </AnimatePresence>
    </>
  );
};

export default CleanNotification;
