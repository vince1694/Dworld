import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContainer = ({ toasts = [], removeToast }) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      zIndex: 3000,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      maxWidth: '380px',
      width: '100%',
      pointerEvents: 'none'
    }}>
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{
                pointerEvents: 'auto',
                padding: '0.85rem 1.15rem',
                borderRadius: '14px',
                background: '#0f172a',
                border: isSuccess 
                  ? '1px solid rgba(16, 185, 129, 0.3)' 
                  : isError 
                  ? '1px solid rgba(239, 68, 68, 0.3)' 
                  : '1px solid var(--border-strong)',
                boxShadow: '0 12px 30px -5px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.85rem',
                color: 'var(--text-main)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {isSuccess && <CheckCircle2 size={20} color="#10b981" />}
                {isError && <AlertCircle size={20} color="#ef4444" />}
                {!isSuccess && !isError && <Info size={20} color="var(--primary)" />}
                
                <span style={{ fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.4 }}>
                  {toast.message}
                </span>
              </div>

              {removeToast && (
                <button
                  onClick={() => removeToast(toast.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px'
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
