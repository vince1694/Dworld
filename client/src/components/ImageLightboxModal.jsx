import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, ExternalLink, Download, Sparkles } from 'lucide-react';

const ImageLightboxModal = ({ 
  isOpen, 
  onClose, 
  imageUrl, 
  title = 'Profile Picture', 
  subtitle = 'Full HD View' 
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  // Reset zoom whenever modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsZoomed(false);
    }
  }, [isOpen]);

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
            background: 'radial-gradient(circle at center, rgba(17, 24, 39, 0.94) 0%, rgba(3, 7, 18, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            touchAction: 'none'
          }}
        >
          {/* Top Control Bar */}
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              right: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 100000,
              maxWidth: '900px',
              margin: '0 auto',
              background: 'rgba(255, 255, 255, 0.06)',
              padding: '0.65rem 1rem',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.37)'
            }}
          >
            <div style={{ color: '#fff', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ 
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  display: 'inline-block' 
                }} />
                <h3 style={{ 
                  fontSize: '0.975rem', 
                  fontWeight: 700, 
                  margin: 0, 
                  letterSpacing: '-0.01em', 
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  maxWidth: '55vw'
                }}>
                  {title}
                </h3>
              </div>
              {subtitle && (
                <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.65)', margin: '2px 0 0 1rem' }}>
                  {subtitle}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Zoom In/Out Toggle */}
              <button
                type="button"
                onClick={() => setIsZoomed(!isZoomed)}
                title={isZoomed ? "Zoom Out" : "Zoom In"}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: isZoomed ? 'var(--primary)' : 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {isZoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
              </button>

              {/* Open Raw / Download */}
              <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open raw full resolution"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
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
                <ExternalLink size={16} />
              </a>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Lightbox"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.25)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fca5a5',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.85)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                  e.currentTarget.style.color = '#fca5a5';
                }}
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>

          {/* Centered Image Card with Mobile Sweep Gesture (drag Y) */}
          <motion.div
            drag={!isZoomed ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.8}
            onDragEnd={(e, info) => {
              // Mobile sweep: if dragged more than 75px or with rapid swipe velocity, dismiss smoothly
              if (Math.abs(info.offset.y) > 75 || Math.abs(info.velocity.y) > 350) {
                onClose();
              }
            }}
            initial={{ scale: 0.9, opacity: 0, y: 15 }}
            animate={{ 
              scale: isZoomed ? 1.45 : 1, 
              opacity: 1, 
              y: 0 
            }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            onClick={(e) => {
              e.stopPropagation();
              // Double click / tap toggle zoom
              setIsZoomed(!isZoomed);
            }}
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '75vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 25px 70px -15px rgba(0, 0, 0, 0.8), 0 0 0 1.5px rgba(255, 255, 255, 0.12)',
              background: '#070a12',
              cursor: isZoomed ? 'zoom-out' : 'grab',
              userSelect: 'none',
              touchAction: 'none'
            }}
          >
            {/* Mobile Drag Indicator Handle */}
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '42px',
              height: '4px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.45)',
              zIndex: 10,
              pointerEvents: 'none'
            }} />

            <img 
              src={imageUrl} 
              alt={title}
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                display: 'block',
                borderRadius: '24px',
                userSelect: 'none',
                pointerEvents: 'none'
              }}
            />
          </motion.div>

          {/* Bottom Interactive Mobile Sweep & Keyboard Hint */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 0.15 }}
            style={{
              position: 'absolute',
              bottom: '1rem',
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              pointerEvents: 'none',
              background: 'rgba(0, 0, 0, 0.55)',
              padding: '0.4rem 1rem',
              borderRadius: '24px',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <Sparkles size={13} color="var(--primary)" />
            <span>Swipe down/up to dismiss • Tap to toggle zoom</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImageLightboxModal;
