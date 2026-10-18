import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ExternalLink } from 'lucide-react';

const ImageLightboxModal = ({ 
  isOpen, 
  onClose, 
  imageUrl, 
  title = 'Profile Picture', 
  subtitle = 'Full HD View' 
}) => {
  // ESC key listener to quickly close lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="image-lightbox-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(11, 15, 25, 0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          {/* Top Control Bar */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '1.25rem',
              left: '1.5rem',
              right: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 100000,
              maxWidth: '850px',
              margin: '0 auto'
            }}
          >
            <div style={{ color: '#fff' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                {title}
              </h3>
              {subtitle && (
                <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)', margin: '2px 0 0 0' }}>
                  {subtitle}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open raw image"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
              >
                <ExternalLink size={18} />
              </a>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close Fullscreen View"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                }}
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>

          {/* Centered Image Container with Spring Animation */}
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '78vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.15)',
              background: '#090d16'
            }}
          >
            <img 
              src={imageUrl} 
              alt={title}
              style={{
                maxWidth: '100%',
                maxHeight: '78vh',
                objectFit: 'contain',
                display: 'block',
                borderRadius: '24px',
                userSelect: 'none'
              }}
            />
          </motion.div>

          {/* Bottom Hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              position: 'absolute',
              bottom: '1.25rem',
              color: 'rgba(255, 255, 255, 0.65)',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              pointerEvents: 'none',
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '0.35rem 0.85rem',
              borderRadius: '20px',
              backdropFilter: 'blur(8px)'
            }}
          >
            <ZoomIn size={14} /> Tap outside or press ESC to close
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImageLightboxModal;
