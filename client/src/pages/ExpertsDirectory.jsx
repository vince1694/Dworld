import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { UserCheck, Star, CalendarPlus, Briefcase, Mail, Phone, Clock, Award, ShieldCheck, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import BookingWizardModal from '../components/BookingWizardModal';

import { API_URL } from '../config/api';

const ExpertsDirectory = () => {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReviewsExpertId, setActiveReviewsExpertId] = useState(null);
  const [reviewsMap, setReviewsMap] = useState({});
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [preselectedServiceId, setPreselectedServiceId] = useState(null);
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
    setPreselectedServiceId(serviceId);
    setIsWizardOpen(true);
  };

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

      <header style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
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
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '620px', margin: '0 auto' }}>
          Browse available experts, explore their offered services and roles, and pick the specialist that suits your needs.
        </p>
      </header>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading specialists catalog...
        </div>
      ) : experts.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>No experts listed yet</h2>
          <p>Check back shortly as new specialists join the platform.</p>
        </div>
      ) : (
        <div className="grid-layout grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: '1.75rem' }}>
          {experts.map((exp, idx) => (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 6px 16px rgba(79, 70, 229, 0.25)'
                  }}>
                    {exp.name ? exp.name.charAt(0).toUpperCase() : 'E'}
                  </div>

                  <div>
                    <h3 style={{ margin: '0 0 0.2rem', fontSize: '1.15rem', fontFamily: 'Outfit' }}>{exp.name}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Award size={13} /> {exp.specialty || 'General Specialist'}
                    </span>
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

              <button 
                onClick={() => {
                  if (exp.services && exp.services.length > 0) {
                    handleBookExpert(String(exp.services[0]._id || exp.services[0].id));
                  } else {
                    setIsWizardOpen(true);
                  }
                }}
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <CalendarPlus size={16} /> Book {exp.name.split(' ')[0]}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExpertsDirectory;
