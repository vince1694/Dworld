import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, Trash2, X } from 'lucide-react';

const ConfirmModal = ({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'danger', // 'danger' | 'warning' | 'info'
  loading = false
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const getTheme = () => {
    switch (type) {
      case 'warning':
        return {
          icon: <AlertTriangle size={24} color="#f59e0b" />,
          iconBg: 'rgba(245, 158, 11, 0.12)',
          buttonBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
          buttonBorder: 'rgba(245, 158, 11, 0.3)'
        };
      case 'info':
        return {
          icon: <Info size={24} color="var(--primary)" />,
          iconBg: 'rgba(79, 70, 229, 0.12)',
          buttonBg: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          buttonBorder: 'rgba(79, 70, 229, 0.3)'
        };
      case 'danger':
      default:
        return {
          icon: <Trash2 size={24} color="#ef4444" />,
          iconBg: 'rgba(239, 68, 68, 0.12)',
          buttonBg: 'linear-gradient(135deg, #ef4444, #dc2626)',
          buttonBorder: 'rgba(239, 68, 68, 0.3)'
        };
    }
  };

  const theme = getTheme();

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!loading) onCancel();
          }}
          style={{
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            backdropFilter: 'blur(8px)',
            background: 'rgba(15, 23, 42, 0.65)'
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="modal-card"
            style={{
              maxWidth: '440px',
              width: '100%',
              borderRadius: '24px',
              padding: '1.75rem',
              background: '#ffffff',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-light)',
              position: 'relative'
            }}
          >
            {/* Close Button */}
            {!loading && (
              <button
                type="button"
                onClick={onCancel}
                style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  background: 'rgba(0, 0, 0, 0.04)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  transition: 'background 0.15s ease'
                }}
              >
                <X size={16} />
              </button>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {/* Icon */}
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '18px',
                  background: theme.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem'
                }}
              >
                {theme.icon}
              </div>

              {/* Title & Message */}
              <h3
                style={{
                  margin: '0 0 0.5rem',
                  fontSize: '1.25rem',
                  fontFamily: 'Outfit',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  letterSpacing: '-0.01em'
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  margin: '0 0 1.75rem',
                  fontSize: '0.9rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.55,
                  maxWidth: '360px'
                }}
              >
                {message}
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                <button
                  type="button"
                  disabled={loading}
                  onClick={onCancel}
                  className="btn btn-secondary"
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    borderRadius: '14px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={onConfirm}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    borderRadius: '14px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    background: theme.buttonBg,
                    border: `1px solid ${theme.buttonBorder}`,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
                    transition: 'opacity 0.15s ease'
                  }}
                >
                  {loading ? 'Processing...' : confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
