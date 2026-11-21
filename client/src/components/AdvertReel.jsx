import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { Play, Sparkles, X, ExternalLink, Smartphone, Download, Loader, ChevronLeft, ChevronRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORY_ICONS = {
  public_awareness: '📢',
  product_feature: '🔍',
  commercial_video: '🛡️',
  special_promo: '💈'
};

const AdvertReel = ({ placement = 'all' }) => {
  const [adverts, setAdverts] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activeModalAdvert, setActiveModalAdvert] = useState(null);
  const [savingToPhone, setSavingToPhone] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    axios.get(`${API_URL}/adverts?placement=${placement}`)
      .then(res => {
        if (isMounted && res.data?.success && res.data.data?.length > 0) {
          setAdverts(res.data.data);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [placement]);

  // Auto-advance banner every 6.5s if modal is closed
  useEffect(() => {
    if (adverts.length <= 1 || activeModalAdvert) return;
    const interval = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % adverts.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [adverts.length, activeModalAdvert]);

  if (!adverts || adverts.length === 0) return null;

  const currentAdv = adverts[currentIdx % adverts.length];

  const getEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  };

  const handleSaveToPhone = async (adv) => {
    if (!adv?.mediaUrl) return;

    const isYouTube = adv.mediaUrl.includes('youtube.com') || adv.mediaUrl.includes('youtu.be');
    if (isYouTube) {
      window.open(adv.mediaUrl, '_blank');
      return;
    }

    try {
      setSavingToPhone(true);
      setSaveSuccessMessage('');

      // Build target download URL through server proxy to ensure clean stream headers
      const downloadUrl = `${API_URL}/adverts/download?url=${encodeURIComponent(adv.mediaUrl)}&title=${encodeURIComponent(adv.title)}`;
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const isVideo = adv.mediaType === 'video';
      const ext = isVideo ? 'mp4' : 'jpg';
      const cleanFileName = `${adv.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${ext}`;
      const file = new File([blob], cleanFileName, { type: isVideo ? 'video/mp4' : 'image/jpeg' });

      // Native Mobile Share Sheet (iOS Safari & Android Chrome) -> Saves to Photos
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: adv.title,
          text: `D.WORLD Commercial Video: ${adv.title}`
        });
        setSaveSuccessMessage('Saved to Photos! Check your camera roll.');
      } else {
        // Desktop or browsers without Web Share Files API
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(objectUrl);
        link.remove();
        setSaveSuccessMessage('Video downloaded successfully!');
      }
    } catch {
      window.open(`${API_URL}/adverts/download?url=${encodeURIComponent(adv.mediaUrl)}&title=${encodeURIComponent(adv.title)}`, '_blank');
      setSaveSuccessMessage('Opening video download...');
    } finally {
      setSavingToPhone(false);
      setTimeout(() => setSaveSuccessMessage(''), 5000);
    }
  };

  return (
    <>
      <div style={{
        margin: '0 0 1.75rem',
        padding: '0.9rem 1.25rem',
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.09) 0%, rgba(99, 102, 241, 0.09) 100%)',
        border: '1px solid rgba(239, 68, 68, 0.22)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flex: '1 1 300px' }}>
          <span style={{
            padding: '0.3rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.7rem',
            fontWeight: 800,
            background: '#ef4444',
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <span>{CATEGORY_ICONS[currentAdv.category] || '🎬'}</span>
            <span>COMMERCIAL</span>
          </span>

          <div style={{ minWidth: 0 }}>
            <h4 style={{ margin: 0, fontSize: '0.94rem', color: 'var(--text-main)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentAdv.title}
            </h4>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentAdv.description || 'Watch the latest official campus commercials & step-by-step booking guide.'}
            </p>
          </div>
        </div>

        {/* Action Buttons & Quick Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {adverts.length > 1 && (
            <div style={{ display: 'flex', gap: '0.25rem', marginRight: '0.3rem' }}>
              {adverts.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIdx(idx)}
                  style={{
                    width: currentIdx % adverts.length === idx ? '18px' : '6px',
                    height: '6px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: currentIdx % adverts.length === idx ? '#ef4444' : 'rgba(150, 150, 160, 0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.25s'
                  }}
                  title={`View Commercial ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {currentAdv.mediaUrl && (
            <button
              onClick={() => setActiveModalAdvert(currentAdv)}
              className="btn btn-primary"
              style={{
                fontSize: '0.8rem',
                padding: '0.42rem 0.95rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 700,
                boxShadow: '0 3px 10px rgba(239, 68, 68, 0.25)'
              }}
            >
              <Play size={14} fill="#ffffff" /> Watch Video
            </button>
          )}

          {currentAdv.ctaLink && (
            <a
              href={currentAdv.ctaLink}
              className="btn btn-secondary"
              style={{
                fontSize: '0.8rem',
                padding: '0.42rem 0.85rem',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 600
              }}
            >
              <span>{currentAdv.ctaText || 'Learn More'}</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* FULL COMMERCIAL SHOWCASE MODAL WITH PLAYLIST & SAVE TO PHOTOS */}
      <AnimatePresence>
        {activeModalAdvert && (
          <div className="modal-overlay" onClick={() => setActiveModalAdvert(null)} style={{ zIndex: 1100 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-card"
              style={{
                maxWidth: '720px',
                width: '100%',
                padding: '1.25rem',
                background: '#090d16',
                color: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #1e293b',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{CATEGORY_ICONS[activeModalAdvert.category] || '🎬'}</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff', fontWeight: 700 }}>{activeModalAdvert.title}</h4>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {activeModalAdvert.category.replace('_', ' ')} • Official D.WORLD Commercial
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModalAdvert(null)}
                  style={{
                    background: '#1e293b',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Video Playlist Quick Tabs */}
              {adverts.length > 1 && (
                <div style={{
                  display: 'flex',
                  gap: '0.4rem',
                  overflowX: 'auto',
                  paddingBottom: '0.65rem',
                  marginBottom: '0.75rem',
                  scrollbarWidth: 'none'
                }}>
                  {adverts.map(adv => (
                    <button
                      key={adv._id}
                      onClick={() => setActiveModalAdvert(adv)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: activeModalAdvert._id === adv._id ? 700 : 500,
                        border: activeModalAdvert._id === adv._id ? '1px solid #ef4444' : '1px solid #1e293b',
                        background: activeModalAdvert._id === adv._id ? 'rgba(239, 68, 68, 0.2)' : '#0f172a',
                        color: activeModalAdvert._id === adv._id ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <span>{CATEGORY_ICONS[adv.category] || '🎬'}</span>
                      <span>{adv.title.split('—')[0].trim()}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Video Player Box */}
              <div style={{
                position: 'relative',
                paddingBottom: '56.25%',
                height: 0,
                overflow: 'hidden',
                borderRadius: '14px',
                background: '#000000',
                marginBottom: '1rem',
                border: '1px solid #1e293b'
              }}>
                {activeModalAdvert.mediaUrl.includes('youtube') || activeModalAdvert.mediaUrl.includes('youtu.be') ? (
                  <iframe
                    src={getEmbedUrl(activeModalAdvert.mediaUrl)}
                    title={activeModalAdvert.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  />
                ) : (
                  <video
                    key={activeModalAdvert.mediaUrl}
                    src={activeModalAdvert.mediaUrl}
                    controls
                    autoPlay
                    playsInline
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                )}
              </div>

              {/* Description & Value Proposition */}
              <div style={{ padding: '0.75rem 1rem', background: '#0f172a', borderRadius: '12px', marginBottom: '1rem', border: '1px solid #1e293b' }}>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.55 }}>
                  {activeModalAdvert.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.74rem', color: '#10b981' }}>
                  <ShieldCheck size={14} />
                  <span>Verified Campus Platform • 100% Escrow Protection</span>
                </div>
              </div>

              {/* Save status notification */}
              {saveSuccessMessage && (
                <div style={{
                  padding: '0.5rem 0.85rem',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '10px',
                  color: '#34d399',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  marginBottom: '1rem'
                }}>
                  <CheckCircle2 size={15} />
                  <span>{saveSuccessMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    disabled={savingToPhone}
                    onClick={() => handleSaveToPhone(activeModalAdvert)}
                    className="btn btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      fontSize: '0.82rem',
                      padding: '0.55rem 1.15rem',
                      borderRadius: '10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontWeight: 700,
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
                    }}
                  >
                    {savingToPhone ? <Loader size={15} className="animate-spin" /> : <Smartphone size={15} />}
                    <span>{savingToPhone ? 'Preparing File...' : 'Save to Phone Photos'}</span>
                  </button>

                  {activeModalAdvert.ctaLink && (
                    <a
                      href={activeModalAdvert.ctaLink}
                      className="btn btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        fontSize: '0.82rem',
                        padding: '0.55rem 1.15rem',
                        borderRadius: '10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontWeight: 700
                      }}
                    >
                      <span>{activeModalAdvert.ctaText || 'Get Started'}</span>
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>

                <button
                  onClick={() => setActiveModalAdvert(null)}
                  className="btn btn-secondary"
                  style={{
                    background: '#1e293b',
                    color: '#ffffff',
                    borderColor: '#334155',
                    fontSize: '0.82rem',
                    padding: '0.55rem 1rem'
                  }}
                >
                  Close
                </button>
              </div>

              {/* Mobile device hint */}
              <span style={{ display: 'block', marginTop: '0.75rem', fontSize: '0.7rem', color: '#64748b', textAlign: 'center' }}>
                💡 Tip: On iPhone Safari or Android, tap "Save to Phone Photos" and choose "Save Video" to store directly into Apple Photos or Google Photos.
              </span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdvertReel;
