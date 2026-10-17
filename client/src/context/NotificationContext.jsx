import React, { createContext, useContext, useState, useCallback } from 'react';
import CleanNotification from '../components/CleanNotification';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);

  // Add toast notification
  const addToast = useCallback((message, type = 'info', duration = 4500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  // Remove toast by id
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Helper convenience methods
  const notify = {
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    // Interactive confirmation pop-up modal
    confirm: ({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'info', onConfirm }) => {
      setConfirmModal({
        title,
        message,
        confirmText,
        cancelText,
        type,
        onConfirm: async () => {
          setConfirmModal(null);
          if (onConfirm) await onConfirm();
        },
        onCancel: () => setConfirmModal(null)
      });
    }
  };

  return (
    <NotificationContext.Provider value={{ notify, addToast, removeToast }}>
      {children}
      <CleanNotification
        toasts={toasts}
        removeToast={removeToast}
        confirmModal={confirmModal}
      />
    </NotificationContext.Provider>
  );
};

export const useNotify = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotify must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
