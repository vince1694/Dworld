import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { Play, Sparkles, X, ExternalLink, Smartphone, Download, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdvertReel = ({ placement = 'all' }) => {
  const [adverts, setAdverts] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activeModalAdvert, setActiveModalAdvert] = useState(null);
  const [savingToPhone, setSavingToPhone] = useState(false);

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
      const downloadUrl = `${API_URL}/adverts/download?url=${encodeURIComponent(adv.mediaUrl)}&title=${encodeURIComponent(adv.title)}`;
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const isVideo = adv.mediaType === 'video';
      const ext = isVideo ? 'mp4' : 'jpg';
      const file = new File([blob], `${adv.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${ext}`, { type: isVideo ? 'video/mp4' : 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: adv.title,
          text: `Save ${adv.title} to phone photos`
        });
      } else {
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(objectUrl);
        link.remove();
      }
    } catch {
      window.open(`${API_URL}/adverts/download?url=${encodeURIComponent(adv.mediaUrl)}&title=${encodeURIComponent(adv.title)}`, '_blank');
    } finally {
      setSavingToPhone(false);
    }
  };

  return (
    <>
      <div style={{
        margin: '0 0 1.5rem',
        padding: '0.85rem 1.15rem',
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <span style={{
            padding: '0.25rem 0.6rem',
            borderRadius: '9999px',
            fontSize: '0.7rem',
            fontWeight: 800,
            background: '#ef4444',
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            flexShrink: 0
          }}>
            COMMERCIAL
          </span>
          <div style={{ minWidth: 0 }}>
            <h4 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentAdv.title}
            </h4>
            <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentAdv.description || 'Watch the latest campus feature spotlight & awareness video.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {currentAdv.mediaUrl && (
            <button
              onClick={() => setActiveModalAdvert(currentAdv)}
              className="btn btn-primary"
              style={{
                fontSize: '0.78rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 700
              }}
            >
              <Play size={13} fill="#ffffff" /> Watch Video
            </button>
          )}

          {currentAdv.ctaLink && (
            <a
              href={currentAdv.ctaLink}
              className="btn btn-secondary"
              style={{
                fontSize: '0.78rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontWeight: 600
              }}
            >
              <span>{currentAdv.ctaText || 'Learn More'}</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* MODAL PREVIEW */}
      <AnimatePresence>
        {activeModalAdvert && (
          <div className="modal-overlay" onClick={() => setActiveModalAdvert(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-card"
              style={{ maxWidth: '680px', width: '100%', padding: '1.25rem', background: '#090d16', color: '#ffffff' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff' }}>{activeModalAdvert.title}</h4>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {activeModalAdvert.category.replace('_', ' ')}
                  </span>
                </div>
                <button onClick={() => setActiveModalAdvert(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px', background: '#000000', marginBottom: '0.85rem' }}>
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
                    src={activeModalAdvert.mediaUrl}
                    controls
                    autoPlay
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                )}
              </div>

              <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                {activeModalAdvert.description}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  type="button"
                  disabled={savingToPhone}
                  onClick={() => handleSaveToPhone(activeModalAdvert)}
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    fontSize: '0.8rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: 700
                  }}
                >
                  {savingToPhone ? <Loader size={14} className="animate-spin" /> : <Smartphone size={14} />}
                  <span>Save to Phone Photos</span>
                </button>

                <button onClick={() => setActiveModalAdvert(null)} className="btn btn-secondary" style={{ background: '#1e293b', color: '#ffffff', borderColor: '#334155' }}>
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdvertReel;
