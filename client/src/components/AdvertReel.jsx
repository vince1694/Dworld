import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';
import { Play, ExternalLink } from 'lucide-react';

const CATEGORY_ICONS = {
  public_awareness: '📢',
  product_feature: '🔍',
  commercial_video: '🎬',
  special_promo: '💈'
};

const AdvertReel = ({ placement = 'all' }) => {
  const navigate = useNavigate();
  const [adverts, setAdverts] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);

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

  // Auto-advance every 6.5s
  useEffect(() => {
    if (adverts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % adverts.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [adverts.length]);

  if (!adverts || adverts.length === 0) return null;

  const currentAdv = adverts[currentIdx % adverts.length];

  return (
    <div style={{
      margin: '0 0 1.75rem',
      padding: '0.9rem 1.25rem',
      background: 'linear-gradient(135deg, rgba(79,70,229,0.09) 0%, rgba(99,102,241,0.09) 100%)',
      border: '1px solid rgba(79,70,229,0.22)',
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '0.85rem',
      boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
    }}>
      {/* Left: badge + title + description */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flex: '1 1 260px' }}>
        <span style={{
          padding: '0.3rem 0.65rem',
          borderRadius: '9999px',
          fontSize: '0.7rem',
          fontWeight: 800,
          background: '#4f46e5',
          color: '#fff',
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
          <h4 style={{
            margin: 0, fontSize: '0.94rem', color: 'var(--text-main)',
            fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {currentAdv.title}
          </h4>
          <p style={{
            margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {currentAdv.description || 'Watch the latest official campus commercials & booking guide.'}
          </p>
        </div>
      </div>

      {/* Right: dot indicators + action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {/* Dot indicators */}
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
                  background: currentIdx % adverts.length === idx
                    ? '#4f46e5'
                    : 'rgba(150,150,160,0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.25s',
                  padding: 0
                }}
                title={`Video ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Watch Videos → goes to standalone /videos page */}
        <button
          onClick={() => navigate('/videos')}
          className="btn btn-primary"
          style={{
            fontSize: '0.8rem',
            padding: '0.42rem 0.95rem',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 3px 10px rgba(79,70,229,0.25)'
          }}
        >
          <Play size={14} fill="#fff" color="#fff" /> Watch Videos
        </button>

        {/* Optional CTA link */}
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
  );
};

export default AdvertReel;
