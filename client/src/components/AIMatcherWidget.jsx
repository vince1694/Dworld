import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Bot, ArrowRight, CheckCircle2, Clock, MapPin, CalendarPlus, RefreshCw } from 'lucide-react';
import axios from 'axios';

import { API_URL } from '../config/api';

const AIMatcherWidget = ({ onSelectService }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState(null);

  const samplePrompts = [
    "Need clean haircut and beard razor line-up",
    "Looking for acrylic nail extensions & custom nail art",
    "Need knotless braids or cornrows on campus",
    "Need frontal wig melt and closure installation",
    "Looking for classic lash extensions or lash lift",
    "Want refreshing manicure and exfoliating pedicure"
  ];

  const handleMatch = async (customPrompt) => {
    const query = customPrompt || prompt;
    if (!query.trim()) return;

    if (customPrompt) setPrompt(customPrompt);

    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/services/ai-match`, { prompt: query });
      if (res.data.success) {
        setMatches(res.data.matches);
      }
    } catch (err) {
      console.error('AI Matcher Error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bento-card" style={{
      background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(79, 70, 229, 0.08), rgba(2, 132, 199, 0.06))',
      border: '1px solid rgba(124, 58, 237, 0.2)',
      borderRadius: '24px',
      padding: '2rem',
      marginBottom: '2.5rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--secondary), var(--primary))',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
        }}>
          <Bot size={20} />
        </div>
        <h3 style={{ margin: 0, fontSize: '1.35rem', fontFamily: 'Outfit', color: 'var(--text-main)' }}>
          AI Live Smart Matcher
        </h3>
      </div>

      <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Describe what you need in plain words, and our AI will analyze requirements to match you with top specialists.
      </p>

      {/* AI Prompt Input Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Sparkles size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary)' }} />
          <input
            type="text"
            placeholder="e.g. 'I need help preparing for a software job interview' or 'Looking for hair styling'..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleMatch()}
            style={{
              width: '100%',
              padding: '0.85rem 1.25rem 0.85rem 3rem',
              background: '#ffffff',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              borderRadius: '14px',
              fontSize: '0.95rem',
              color: 'var(--text-main)',
              outline: 'none'
            }}
          />
        </div>

        <button
          onClick={() => handleMatch()}
          disabled={loading || !prompt.trim()}
          className="btn btn-primary"
          style={{
            background: 'linear-gradient(135deg, var(--secondary), var(--primary))',
            padding: '0.85rem 1.75rem',
            borderRadius: '14px',
            fontWeight: 700
          }}
        >
          {loading ? (
            <>
              <RefreshCw size={16} className="animate-spin" /> Matching...
            </>
          ) : (
            <>
              Match Request <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>

      {/* Sample Quick Prompts */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: matches ? '1.5rem' : 0 }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Quick Examples:</span>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleMatch(p)}
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-light)',
              borderRadius: '9999px',
              padding: '0.25rem 0.65rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            "{p}"
          </button>
        ))}
      </div>

      {/* AI MATCH RESULTS DISPLAY */}
      {matches && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} style={{ borderTop: '1px solid rgba(124, 58, 237, 0.2)', paddingTop: '1.5rem', marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚡ AI RECOMMENDED MATCHES ({matches.length})
            </span>
            <button onClick={() => setMatches(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer' }}>
              Dismiss
            </button>
          </div>

          <div className="grid-layout grid-cols-1 md:grid-cols-3" style={{ gap: '1rem' }}>
            {matches.map((item, idx) => {
              const srv = item.service;
              const srvId = String(srv._id || srv.id);
              return (
                <div
                  key={srvId}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    border: idx === 0 ? '2px solid var(--secondary)' : '1px solid var(--border-light)',
                    boxShadow: idx === 0 ? '0 8px 20px rgba(124, 58, 237, 0.15)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    position: 'relative'
                  }}
                >
                  {/* Confidence Match Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{
                        background: idx === 0 ? 'rgba(124, 58, 237, 0.15)' : '#f1f5f9',
                        color: idx === 0 ? 'var(--secondary)' : 'var(--text-muted)',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 800
                      }}>
                        {item.score}% Confidence Match
                      </span>
                      {srv.tierLabel && (
                        <span style={{ fontSize: '0.725rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#f8fafc', border: '1px solid var(--border-light)' }}>
                          {srv.tierLabel}
                        </span>
                      )}
                    </div>
                    <strong style={{ color: 'var(--primary)', fontFamily: 'Outfit', fontSize: '1.1rem' }}>
                      ₦{srv.price?.toLocaleString()}
                    </strong>
                  </div>

                  <h4 style={{ margin: '0 0 0.4rem', fontSize: '1.05rem', fontFamily: 'Outfit' }}>{srv.name}</h4>
                  <p style={{ margin: '0 0 0.85rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {item.reason}
                  </p>

                  <button
                    onClick={() => onSelectService(srvId)}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      justify: 'center',
                      fontSize: '0.85rem',
                      background: idx === 0 ? 'linear-gradient(135deg, var(--secondary), var(--primary))' : 'var(--primary)'
                    }}
                  >
                    <CalendarPlus size={15} /> Book Matched Expert
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AIMatcherWidget;
