import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';

const PWAInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (PWA installed)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                             window.navigator.standalone === true;
    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) return;

    // Check if dismissed recently (24 hours)
    const dismissedTime = localStorage.getItem('dworld_pwa_dismissed');
    if (dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 24 * 60 * 60 * 1000) {
      return;
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Wait a moment so user settles in before showing install banner
      setTimeout(() => setShowBanner(true), 2500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] User choice:', outcome);

    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('dworld_pwa_dismissed', Date.now().toString());
  };

  if (isStandalone || !showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        style={{
          position: 'fixed',
          bottom: '1.25rem',
          left: '1.25rem',
          right: '1.25rem',
          maxWidth: '460px',
          margin: '0 auto',
          zIndex: 9990,
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 27, 75, 0.98))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(129, 140, 248, 0.3)',
          borderRadius: '20px',
          padding: '1rem 1.25rem',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 20px rgba(79, 70, 229, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          color: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
            flexShrink: 0
          }}>
            <Smartphone size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, fontFamily: 'Outfit', color: '#f8fafc' }}>
                Install D.World App
              </h4>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '6px',
                background: 'rgba(52, 211, 153, 0.2)',
                color: '#34d399'
              }}>
                PWA
              </span>
            </div>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.3 }}>
              Fast offline booking, instant notifications & easy access.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <button
            onClick={handleInstallClick}
            type="button"
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
              border: 'none',
              borderRadius: '10px',
              color: '#ffffff',
              padding: '0.55rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)',
              whiteSpace: 'nowrap'
            }}
          >
            <Download size={14} /> Install
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install banner"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'color 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallBanner;
