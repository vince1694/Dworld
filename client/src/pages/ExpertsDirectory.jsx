import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { UserCheck, Star, CalendarPlus, Briefcase, Mail, Phone, Clock, Award, ShieldCheck, MessageSquare, ChevronDown, ChevronUp, Images, ChevronRight, MapPin, Search } from 'lucide-react';
import BookingWizardModal from '../components/BookingWizardModal';

import { API_URL } from '../config/api';

const ExpertsDirectory = () => {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReviewsExpertId, setActiveReviewsExpertId] = useState(null);
  const [reviewsMap, setReviewsMap] = useState({});
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [preselectedServiceId, setPreselectedServiceId] = useState(null);
  const [locationQuery, setLocationQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchExperts();
  }, []);

  const fetchExperts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/auth/experts`);
      if (res.data.success) {
        setExperts(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch experts', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleReviews = async (expertId) => {
    if (activeReviewsExpertId === expertId) {
      setActiveReviewsExpertId(null);
      return;
    }

    setActiveReviewsExpertId(expertId);
    if (!reviewsMap[expertId]) {
      try {
        const res = await axios.get(`${API_URL}/reviews/expert/${expertId}`);
        if (res.data.success) {
          setReviewsMap(prev => ({ ...prev, [expertId]: res.data.data }));
        }
      } catch (err) {
        console.error('Failed to fetch expert reviews', err);
      }
    }
  };

  const handleBookExpert = (serviceId) => {
    navigate(serviceId ? `/book?serviceId=${serviceId}` : '/book');
  };

  const filteredExperts = experts.filter(exp => {
    if (!locationQuery.trim()) return true;
    const q = locationQuery.toLowerCase();
    const loc = (exp.address || exp.location || '').toLowerCase();
    const name = (exp.name || '').toLowerCase();
    const spec = (exp.specialty || '').toLowerCase();
    return loc.includes(q) || name.includes(q) || spec.includes(q);
  });

  return (
    <div className="page-wrapper container animate-fade-in">
      
      {/* Booking Wizard Modal */}
      <BookingWizardModal 
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        preselectedServiceId={preselectedServiceId}
        onBookingSuccess={() => {
          navigate('/dashboard');
        }}
      />

      <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span style={{ 
          color: 'var(--primary)', 
          fontWeight: 700, 
          fontSize: '0.825rem', 
          marginBottom: '0.75rem', 
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'rgba(79, 70, 229, 0.08)',
          padding: '0.35rem 0.9rem',
          borderRadius: '9999px',
          border: '1px solid rgba(79, 70, 229, 0.15)'
        }}>
          <UserCheck size={15} /> Verified Specialists & Professionals
        </span>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.75rem', color: 'var(--text-main)', letterSpacing: '-0.02em', fontFamily: 'Outfit' }}>
          Experts & Specialists Directory
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '620px', margin: '0 auto 1.75rem' }}>
          Browse available experts, explore their single specialty services, and find nearby specialists by campus location or hostel.
        </p>

        {/* Nearby Location Search Bar */}
        <div style={{ maxWidth: '520px', margin: '0 auto', position: 'relative' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#ffffff',
            borderRadius: '16px',
            padding: '0.5rem 1rem',
            border: '1.5px solid rgba(79, 70, 229, 0.2)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.04)'
          }}>
            <MapPin size={18} color="var(--primary)" style={{ flexShrink: 0, marginRight: '0.65rem' }} />
            <input
              type="text"
              placeholder="Find nearby experts by location (e.g. Unity Hall, Hostel, Off-campus)..."
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '0.9rem',
                color: 'var(--text-main)',
                fontFamily: 'inherit'
              }}
            />
            {locationQuery && (
              <button
                type="button"
                onClick={() => setLocationQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.5rem'
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading specialists catalog...
        </div>
      ) : filteredExperts.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>
            {locationQuery ? `No experts found matching "${locationQuery}"` : 'No experts listed yet'}
          </h2>
          <p>{locationQuery ? 'Try searching for another hostel, hall, or location keyword.' : 'Check back shortly as new specialists join the platform.'}</p>
          {locationQuery && (
            <button onClick={() => setLocationQuery('')} className="btn btn-secondary" style={{ marginTop: '0.75rem' }}>
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid-layout grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: '1.75rem' }}>
          {filteredExperts.map((exp, idx) => (
            <motion.div
              key={exp.id || exp._id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.25 }}
              className="bento-card"
              style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                {/* Avatar & Header */}
                <div 
                  onClick={() => navigate(`/expert/${exp.id || exp._id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', cursor: 'pointer' }}
                  title={`View ${exp.name}'s Professional Page & Works`}
                >
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 6px 16px rgba(79, 70, 229, 0.25)',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {exp.avatar ? (
                      <img src={exp.avatar} alt={exp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      exp.name ? exp.name.charAt(0).toUpperCase() : 'E'
                    )}
                  </div>

                  <div>
                    <h3 style={{ margin: '0 0 0.2rem', fontSize: '1.15rem', fontFamily: 'Outfit' }}>{exp.name}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Award size={13} /> {exp.specialty || 'General Specialist'}
                    </span>
                    {(exp.address || exp.location) && (
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: '#059669', 
                        fontWeight: 600, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.25rem',
                        marginTop: '0.25rem',
                        background: '#ecfdf5',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        width: 'fit-content'
                      }}>
                        <MapPin size={11} /> {exp.address || exp.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Rating & Bio & Reviews Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <Star size={14} color="#f59e0b" fill="#f59e0b" />
                    <strong style={{ fontSize: '0.85rem' }}>{exp.rating || 4.9} / 5.0</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>(Verified)</span>
                  </div>

                  <button
                    onClick={() => toggleReviews(exp.id || exp._id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <MessageSquare size={13} /> Reviews {activeReviewsExpertId === (exp.id || exp._id) ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {/* Collapsible Reviews List */}
                {activeReviewsExpertId === (exp.id || exp._id) && (
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '0.85rem', marginBottom: '1rem', border: '1px solid var(--border-light)', maxHeight: '160px', overflowY: 'auto' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                      CLIENT REVIEWS & FEEDBACK
                    </span>
                    {reviewsMap[exp.id || exp._id] && reviewsMap[exp.id || exp._id].length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {reviewsMap[exp.id || exp._id].map(rev => (
                          <div key={rev._id} style={{ background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                              <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{rev.client_id?.name || 'Client'}</strong>
                              <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700 }}>{'⭐'.repeat(rev.rating)}</span>
                            </div>
                            {rev.comment && <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--text-muted)' }}>"{rev.comment}"</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.775rem', color: 'var(--text-subtle)' }}>No reviews written yet for this expert.</span>
                    )}
                  </div>
                )}

                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  {exp.bio || 'Experienced specialist offering high quality appointment services.'}
                </p>

                {/* ── Lookbook Photo Strip ── */}
                {exp.portfolio && exp.portfolio.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                      <Images size={13} color="var(--secondary)" />
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lookbook — {exp.portfolio.length} styles</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      {exp.portfolio.slice(0, 8).map((item, pi) => (
                        <div
                          key={pi}
                          title={item.title || item.category || 'Portfolio'}
                          style={{
                            flexShrink: 0,
                            width: '80px',
                            height: '80px',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            border: '1.5px solid var(--border-light)',
                            background: 'rgba(168,85,247,0.06)',
                            position: 'relative',
                            transition: 'transform 0.15s ease',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
                          onMouseLeave={e => e.currentTarget.style.transform = ''}
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.title || 'Lookbook'}
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => { e.target.style.opacity = '0.2'; }}
                          />
                        </div>
                      ))}
                      {exp.portfolio.length > 8 && (
                        <div style={{ flexShrink: 0, width: '80px', height: '80px', borderRadius: '10px', background: 'rgba(168,85,247,0.1)', border: '1.5px solid rgba(168,85,247,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)' }}>+{exp.portfolio.length - 8}</span>
                          <span style={{ fontSize: '0.6rem', color: 'var(--secondary)', fontWeight: 600 }}>more</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Offered Services List */}
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.775rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.65rem' }}>
                    SERVICES OFFERED BY {exp.name.split(' ')[0].toUpperCase()}
                  </span>

                  {exp.services && exp.services.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {exp.services.map(srv => {
                        const srvId = String(srv._id || srv.id);
                        return (
                          <div 
                            key={srvId}
                            onClick={() => handleBookExpert(srvId)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.6rem 0.85rem',
                              borderRadius: '10px',
                              background: '#f8fafc',
                              border: '1px solid var(--border-light)',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                            className="hover-card-select"
                          >
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{srv.name}</span>
                            <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>₦{srv.price?.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>No custom services listed yet.</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '0.75rem' }}>
                <button 
                  type="button"
                  onClick={() => navigate(`/expert/${exp.id || exp._id}`)}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'center', fontSize: '0.85rem', borderRadius: '12px', fontWeight: 700 }}
                >
                  <Images size={15} /> View Works
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (exp.services && exp.services.length > 0) {
                      handleBookExpert(String(exp.services[0]._id || exp.services[0].id));
                    } else {
                      setIsWizardOpen(true);
                    }
                  }}
                  className="btn btn-primary" 
                  style={{ justifyContent: 'center', fontSize: '0.85rem', borderRadius: '12px', fontWeight: 700 }}
                >
                  <CalendarPlus size={15} /> Book
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExpertsDirectory;
