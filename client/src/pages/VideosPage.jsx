import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Volume2, VolumeX, Maximize2, Download,
  Smartphone, ChevronLeft, ChevronRight, X, CheckCircle2,
  Loader, Shield, ArrowLeft, Sparkles
} from 'lucide-react';
import { API_URL } from '../config/api';

const CATEGORY_LABEL = {
  public_awareness: 'Public Awareness',
  product_feature: 'Product Feature',
  commercial_video: 'Commercial Video',
  special_promo: 'Special Promo',
};
const CATEGORY_COLOR = {
  public_awareness: '#4f46e5',
  product_feature: '#7c3aed',
  commercial_video: '#4f46e5',
  special_promo: '#f59e0b',
};

const VideoCard = ({ adv, isActive, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    style={{
      width: '100%',
      background: isActive
        ? 'linear-gradient(135deg, rgba(79,70,229,0.15), rgba(99,102,241,0.08))'
        : 'var(--bg-card)',
      border: isActive ? '2px solid #4f46e5' : '1.5px solid var(--border-light)',
      borderRadius: '14px',
      padding: '1rem',
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '0.85rem',
    }}
  >
    {/* Thumbnail / play icon */}
    <div style={{
      width: 52, height: 52, borderRadius: '10px', flexShrink: 0,
      background: isActive
        ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
        : 'linear-gradient(135deg, rgba(79,70,229,0.12), rgba(124,58,237,0.08))',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      {isActive
        ? <Play size={20} fill="#fff" color="#fff" />
        : <Play size={18} color="#4f46e5" />}
    </div>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{
        fontSize: '0.82rem', fontWeight: 700,
        color: isActive ? '#4f46e5' : 'var(--text-main)',
        marginBottom: '0.25rem',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
      }}>
        {adv.title}
      </div>
      <span style={{
        fontSize: '0.7rem', fontWeight: 600,
        background: `${CATEGORY_COLOR[adv.category] || '#4f46e5'}18`,
        color: CATEGORY_COLOR[adv.category] || '#4f46e5',
        borderRadius: '6px', padding: '0.15rem 0.5rem',
      }}>
        {CATEGORY_LABEL[adv.category] || adv.category}
      </span>
    </div>
    {isActive && (
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f46e5', flexShrink: 0 }} />
    )}
  </motion.button>
);

const VideosPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [adverts, setAdverts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [savingToPhone, setSavingToPhone] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/adverts`)
      .then(res => {
        if (res.data?.success && res.data.data?.length > 0) {
          // Only show MP4 / local video adverts
          const videos = res.data.data.filter(a =>
            a.mediaUrl && !a.mediaUrl.includes('youtube') && !a.mediaUrl.includes('youtu.be')
          );
          setAdverts(videos.length > 0 ? videos : res.data.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = adverts[activeIdx] || null;

  const handleVideoSelect = (idx) => {
    setActiveIdx(idx);
    setPlaying(false);
    setSaveMsg('');
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setMuted(videoRef.current.muted);
  };

  const goFullscreen = () => {
    if (videoRef.current?.requestFullscreen) videoRef.current.requestFullscreen();
    else if (videoRef.current?.webkitEnterFullscreen) videoRef.current.webkitEnterFullscreen();
  };

  const handleSave = async () => {
    if (!active?.mediaUrl) return;
    try {
      setSavingToPhone(true);
      setSaveMsg('');
      const url = `${API_URL}/adverts/download?url=${encodeURIComponent(active.mediaUrl)}&title=${encodeURIComponent(active.title)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const name = `${active.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.mp4`;
      const file = new File([blob], name, { type: 'video/mp4' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: active.title, text: `D.WORLD: ${active.title}` });
        setSaveMsg('Saved to Photos! Check your camera roll.');
      } else {
        const obj = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = obj; a.download = name;
        document.body.appendChild(a); a.click();
        URL.revokeObjectURL(obj); a.remove();
        setSaveMsg('Video downloaded!');
      }
    } catch {
      window.open(`${API_URL}/adverts/download?url=${encodeURIComponent(active.mediaUrl)}&title=${encodeURIComponent(active.title)}`, '_blank');
      setSaveMsg('Opening download…');
    } finally {
      setSavingToPhone(false);
      setTimeout(() => setSaveMsg(''), 5000);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <Loader size={28} className="animate-spin" color="#4f46e5" />
    </div>
  );

  if (!active) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: 'var(--bg-main)' }}>
      <Sparkles size={36} color="#4f46e5" />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No videos available yet.</p>
      <button onClick={() => navigate('/')} className="btn btn-primary">Go Home</button>
    </div>
  );

  const isYT = active.mediaUrl?.includes('youtube') || active.mediaUrl?.includes('youtu.be');
  const getEmbed = (url) => {
    if (!url) return '';
    if (url.includes('watch?v=')) return `https://www.youtube.com/embed/${url.split('v=')[1]?.split('&')[0]}?autoplay=1`;
    if (url.includes('youtu.be/')) return `https://www.youtube.com/embed/${url.split('youtu.be/')[1]?.split('?')[0]}?autoplay=1`;
    return url;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: '3rem' }}>
      {/* ── Top bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-light)',
        padding: '0.75rem 1.25rem',
        display: 'flex', alignItems: 'center', gap: '0.85rem'
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.3rem' }}
        >
          <ArrowLeft size={20} color="var(--text-main)" />
        </button>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
            D.WORLD Commercials
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {adverts.length} official campus videos
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.25rem 1rem' }}>

        {/* ── Video Player ── */}
        <motion.div
          key={active._id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: '#090d16',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px -12px rgba(79,70,229,0.25)',
            marginBottom: '1rem',
          }}
        >
          {/* Video area */}
          <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
            {isYT ? (
              <iframe
                src={getEmbed(active.mediaUrl)}
                title={active.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  key={active.mediaUrl}
                  src={active.mediaUrl}
                  playsInline
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => {
                    setPlaying(false);
                    if (activeIdx < adverts.length - 1) {
                      setTimeout(() => { setActiveIdx(i => i + 1); setPlaying(false); }, 800);
                    }
                  }}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                />
                {/* Play/Pause overlay */}
                <button
                  onClick={togglePlay}
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <AnimatePresence>
                    {!playing && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.2, opacity: 0 }}
                        style={{
                          width: 64, height: 64, borderRadius: '50%',
                          background: 'rgba(79,70,229,0.9)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 8px 32px rgba(79,70,229,0.5)'
                        }}
                      >
                        <Play size={26} fill="#fff" color="#fff" style={{ marginLeft: 3 }} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </>
            )}
          </div>

          {/* Controls bar */}
          {!isYT && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              background: '#0f172a',
              gap: '0.5rem', flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={togglePlay} style={ctrlBtn}>
                  {playing ? <Pause size={18} color="#fff" /> : <Play size={18} fill="#fff" color="#fff" />}
                </button>
                <button onClick={toggleMute} style={ctrlBtn}>
                  {muted ? <VolumeX size={18} color="#94a3b8" /> : <Volume2 size={18} color="#fff" />}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={goFullscreen} style={ctrlBtn} title="Fullscreen">
                  <Maximize2 size={16} color="#fff" />
                </button>
              </div>
            </div>
          )}

          {/* Title + meta */}
          <div style={{ padding: '1rem 1.25rem 0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                  {active.title}
                </h2>
                <span style={{
                  display: 'inline-block', marginTop: '0.4rem',
                  fontSize: '0.7rem', fontWeight: 600,
                  background: `${CATEGORY_COLOR[active.category] || '#4f46e5'}28`,
                  color: CATEGORY_COLOR[active.category] || '#4f46e5',
                  borderRadius: '6px', padding: '0.2rem 0.6rem',
                  textTransform: 'uppercase', letterSpacing: '0.04em'
                }}>
                  {CATEGORY_LABEL[active.category] || active.category}
                </span>
              </div>
              {/* Nav arrows */}
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <button
                  onClick={() => handleVideoSelect(Math.max(0, activeIdx - 1))}
                  disabled={activeIdx === 0}
                  style={{ ...ctrlBtn, opacity: activeIdx === 0 ? 0.3 : 1 }}
                >
                  <ChevronLeft size={18} color="#fff" />
                </button>
                <button
                  onClick={() => handleVideoSelect(Math.min(adverts.length - 1, activeIdx + 1))}
                  disabled={activeIdx === adverts.length - 1}
                  style={{ ...ctrlBtn, opacity: activeIdx === adverts.length - 1 ? 0.3 : 1 }}
                >
                  <ChevronRight size={18} color="#fff" />
                </button>
              </div>
            </div>

            {active.description && (
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.55 }}>
                {active.description}
              </p>
            )}

            {/* Escrow trust line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.6rem', fontSize: '0.74rem', color: '#10b981' }}>
              <Shield size={13} />
              <span>Verified Campus Platform · 100% Escrow Protection</span>
            </div>
          </div>

          {/* Action row */}
          <div style={{ padding: '0.85rem 1.25rem 1.25rem', display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Save to phone */}
            {!isYT && (
              <button
                onClick={handleSave}
                disabled={savingToPhone}
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                  display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                  fontSize: '0.84rem', padding: '0.6rem 1.15rem', borderRadius: '12px',
                  fontWeight: 700, boxShadow: '0 4px 14px rgba(79,70,229,0.35)'
                }}
              >
                {savingToPhone ? <Loader size={15} className="animate-spin" /> : <Smartphone size={15} />}
                {savingToPhone ? 'Preparing…' : 'Save to Phone Photos'}
              </button>
            )}
            {active.ctaLink && (
              <a
                href={active.ctaLink}
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  fontSize: '0.84rem', padding: '0.6rem 1.1rem', borderRadius: '12px',
                  fontWeight: 600
                }}
              >
                {active.ctaText || 'Explore D.WORLD'}
              </a>
            )}
          </div>

          {/* Save success toast */}
          <AnimatePresence>
            {saveMsg && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  margin: '0 1.25rem 1rem',
                  padding: '0.55rem 0.9rem',
                  background: 'rgba(16,185,129,0.14)',
                  border: '1px solid rgba(16,185,129,0.4)',
                  borderRadius: '10px', color: '#34d399',
                  fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem'
                }}
              >
                <CheckCircle2 size={14} /> {saveMsg}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Playlist ── */}
        <div style={{ marginBottom: '0.75rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Up Next — {adverts.length} Videos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {adverts.map((adv, i) => (
              <VideoCard
                key={adv._id}
                adv={adv}
                isActive={i === activeIdx}
                onClick={() => handleVideoSelect(i)}
              />
            ))}
          </div>
        </div>

        {/* Mobile tip */}
        <p style={{
          marginTop: '1.5rem', fontSize: '0.72rem', color: 'var(--text-subtle)',
          textAlign: 'center', lineHeight: 1.5
        }}>
          💡 On iPhone Safari or Android Chrome, tap "Save to Phone Photos" then choose "Save Video" to store it directly in your Photos / Gallery.
        </p>
      </div>
    </div>
  );
};

const ctrlBtn = {
  background: 'rgba(255,255,255,0.1)',
  border: 'none',
  borderRadius: '8px',
  width: 36, height: 36,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background 0.15s'
};

export default VideosPage;
