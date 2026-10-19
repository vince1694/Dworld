import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Search, 
  Sparkles, 
  Clock, 
  MapPin, 
  User, 
  CalendarPlus, 
  Filter, 
  X, 
  UserCheck, 
  Star, 
  Award, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp, 
  Grid, 
  Users,
  Images
} from 'lucide-react';
import BookingWizardModal from '../components/BookingWizardModal';
import AIMatcherWidget from '../components/AIMatcherWidget';
import VerifiedBadge from '../components/VerifiedBadge';

import { API_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';

const Services = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'services'; // 'services' or 'experts'
  
  const [services, setServices] = useState([]);
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'single', 'package'
  
  // Review Drawer state for experts
  const [activeReviewsExpertId, setActiveReviewsExpertId] = useState(null);
  const [reviewsMap, setReviewsMap] = useState({});

  // Booking Modal
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [preselectedServiceId, setPreselectedServiceId] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [servicesRes, expertsRes] = await Promise.all([
        axios.get(`${API_URL}/services`),
        axios.get(`${API_URL}/auth/experts`)
      ]);

      if (servicesRes.data.success) setServices(servicesRes.data.data);
      if (expertsRes.data.success) setExperts(expertsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch services and experts', err);
    } finally {
      setLoading(false);
    }
  };

  const { user } = useAuth();
  const { notify } = useNotify();

  const handleBookService = (serviceId) => {
    if (user && (user.role === 'expert' || user.role === 'stylist')) {
      notify.warning('Only customer accounts can book appointments. Experts cannot book appointments.');
      return;
    }
    navigate(`/book?serviceId=${serviceId}`);
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

  // Filtered Services
  const filteredServices = services.filter(srv => {
    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = (srv.name || '').toLowerCase().includes(q);
      const matchDesc = (srv.description || '').toLowerCase().includes(q);
      const matchCat = (srv.category || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchCat) return false;
    }

    // Category Filter
    if (selectedCategory !== 'All') {
      const name = (srv.name || '').toLowerCase();
      const cat = (srv.category || '').toLowerCase();
      const desc = (srv.description || '').toLowerCase();
      const text = `${name} ${cat} ${desc}`;

      if (selectedCategory === 'Lash Techs' && !(text.includes('lash') || text.includes('extension') || text.includes('brow'))) return false;
      if (selectedCategory === 'Nail Techs' && !(text.includes('nail') || text.includes('manicure') || text.includes('pedicure') || text.includes('acrylic') || text.includes('gel'))) return false;
      if (selectedCategory === 'Hair Braider' && !(text.includes('braid') || text.includes('cornrow') || text.includes('knotless') || text.includes('twist') || text.includes('locs') || text.includes('hair'))) return false;
      if (selectedCategory === 'Wig Installers' && !(text.includes('wig') || text.includes('frontal') || text.includes('closure') || text.includes('revamp') || text.includes('install'))) return false;
      if (selectedCategory === 'Barber' && !(text.includes('barber') || text.includes('haircut') || text.includes('fade') || text.includes('male') || text.includes('shave'))) return false;
      if (selectedCategory === 'Body Care' && !(text.includes('body') || text.includes('skin') || text.includes('facial') || text.includes('massage') || text.includes('wax') || text.includes('pedicure'))) return false;
    }

    return true;
  });

  // Filtered Experts
  const filteredExperts = experts.filter(exp => {
    const q = searchQuery.toLowerCase();
    return exp.name?.toLowerCase().includes(q) ||
           (exp.specialty && exp.specialty.toLowerCase().includes(q)) ||
           (exp.bio && exp.bio.toLowerCase().includes(q)) ||
           (exp.address && exp.address.toLowerCase().includes(q)) ||
           (exp.location && exp.location.toLowerCase().includes(q));
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

      {/* AI SMART LIVE MATCHER WIDGET */}
      <AIMatcherWidget onSelectService={handleBookService} />

      {/* HEADER SECTION */}
      <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.75rem', color: 'var(--text-main)', letterSpacing: '-0.02em', fontFamily: 'Outfit', fontWeight: 900 }}>
          Campus Services & Verified Specialists
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '680px', margin: '0 auto 2rem' }}>
          Explore approved Lead City University stylists by location, specialty, and pricing.
        </p>

        {/* MASTER VIEW TOGGLE SWITCH (SERVICES VS EXPERTS) */}
        <div style={{ 
          display: 'inline-flex', 
          maxWidth: '100%',
          background: '#f1f5f9', 
          padding: '0.35rem', 
          borderRadius: '9999px', 
          border: '1px solid var(--border-light)', 
          gap: '0.35rem',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => setSearchParams({ tab: 'services' })}
            style={{
              padding: '0.55rem clamp(0.9rem, 3vw, 1.5rem)',
              borderRadius: '9999px',
              border: 'none',
              background: activeTab === 'services' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'services' ? 'white' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: activeTab === 'services' ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <Grid size={16} /> Services ({services.length})
          </button>

          <button
            onClick={() => setSearchParams({ tab: 'experts' })}
            style={{
              padding: '0.55rem clamp(0.9rem, 3vw, 1.5rem)',
              borderRadius: '9999px',
              border: 'none',
              background: activeTab === 'experts' ? 'var(--secondary)' : 'transparent',
              color: activeTab === 'experts' ? 'white' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: activeTab === 'experts' ? '0 4px 12px rgba(124, 58, 237, 0.25)' : 'none',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <Users size={16} /> Specialists ({experts.length})
          </button>
        </div>
      </header>

      {/* ================= TAB 1: SERVICES CATALOG ================= */}
      {activeTab === 'services' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          
          {/* Service Category Chips */}
          <div className="chips-scroller" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
            {['All', 'Lash Techs', 'Nail Techs', 'Hair Braider', 'Wig Installers', 'Barber', 'Body Care'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '9999px',
                  border: selectedCategory === cat ? '1.5px solid var(--primary)' : '1px solid var(--border-light)',
                  background: selectedCategory === cat ? 'rgba(79, 70, 229, 0.1)' : '#ffffff',
                  color: selectedCategory === cat ? 'var(--primary)' : 'var(--text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading services...</div>
          ) : filteredServices.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--border-light)' }}>
              <h3>No services match your query</h3>
              <button onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
                Reset Search Filters
              </button>
            </div>
          ) : (
            <div className="grid-layout grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: '1.5rem' }}>
              {filteredServices.map((srv, idx) => {
                const srvId = String(srv._id || srv.id);
                return (
                  <motion.div 
                    key={srvId}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => handleBookService(srvId)}
                    className="app-card hover-card-select"
                    style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ width: '42px', height: '42px', background: 'rgba(79, 70, 229, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                          <Sparkles size={22} />
                        </div>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)', fontFamily: 'Outfit' }}>
                          ₦{srv.price?.toLocaleString()}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontFamily: 'Outfit' }}>{srv.name}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                        {srv.description}
                      </p>
                    </div>

                    <div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.85rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Clock size={14} color="var(--primary)" /> <span>Duration: <strong>{srv.duration} mins</strong></span>
                        </div>
                        {srv.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <MapPin size={14} color="var(--secondary)" /> <span>Location: <strong>{srv.location}</strong></span>
                          </div>
                        )}
                      </div>

                      <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        <CalendarPlus size={16} /> Book Service
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ================= TAB 2: SPECIALIST EXPERTS DIRECTORY ================= */}
      {activeTab === 'experts' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading specialists...</div>
          ) : filteredExperts.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--border-light)' }}>
              <h3>No experts match your query</h3>
              <button onClick={() => setSearchQuery('')} className="btn btn-secondary" style={{ marginTop: '1rem' }}>Clear Search</button>
            </div>
          ) : (
            <div className="grid-layout grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: '1.5rem' }}>
              {filteredExperts.map((exp, idx) => {
                const expId = String(exp._id || exp.id);
                return (
                  <motion.div
                    key={expId}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="app-card"
                    style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                  >
                    <div>
                      {/* Expert Header */}
                      <div 
                        onClick={() => navigate(`/expert/${expId}`)}
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
                          flexShrink: 0,
                          border: '2px solid rgba(79, 70, 229, 0.2)'
                        }}>
                          {exp.avatar ? (
                            <img 
                              src={exp.avatar} 
                              alt={exp.name} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          ) : (
                            exp.name ? exp.name.charAt(0).toUpperCase() : 'E'
                          )}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontFamily: 'Outfit' }}>{exp.name}</h3>
                            <VerifiedBadge size="small" text="OFFICIAL LCU SPECIALIST" />
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Award size={13} /> {exp.specialty || 'General Specialist'}
                          </span>
                          {(exp.address || exp.location) && (
                            <span style={{ 
                              fontSize: '0.72rem', 
                              color: '#059669', 
                              fontWeight: 600, 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.25rem',
                              marginTop: '0.2rem',
                              background: '#ecfdf5',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '6px',
                              width: 'fit-content'
                            }}>
                              <MapPin size={11} /> {exp.address || exp.location}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Rating & Review Toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                          <Star size={14} color="#f59e0b" fill="#f59e0b" />
                          <strong style={{ fontSize: '0.85rem' }}>{exp.rating || 4.9} / 5.0</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>(Verified)</span>
                        </div>

                        <button
                          onClick={() => toggleReviews(expId)}
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <MessageSquare size={13} /> Reviews {activeReviewsExpertId === expId ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </div>

                      {/* Reviews Drawer */}
                      {activeReviewsExpertId === expId && (
                        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '0.85rem', marginBottom: '1rem', border: '1px solid var(--border-light)', maxHeight: '160px', overflowY: 'auto' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                            CLIENT REVIEWS & FEEDBACK
                          </span>
                          {reviewsMap[expId] && reviewsMap[expId].length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {reviewsMap[expId].map(rev => (
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
                                  onClick={() => handleBookService(srvId)}
                                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', borderRadius: '10px', background: '#f8fafc', border: '1px solid var(--border-light)', cursor: 'pointer', fontSize: '0.85rem' }}
                                  className="hover-card-select"
                                >
                                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{srv.name}</span>
                                  <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>₦{srv.price?.toLocaleString()}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Verified campus specialist.</span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/expert/${expId}`)}
                          className="btn btn-secondary"
                          style={{ justifyContent: 'center', borderRadius: '12px', fontWeight: 700, fontSize: '0.85rem' }}
                        >
                          <Images size={15} /> View Works
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/book?expertId=${expId}`)}
                          className="btn btn-primary"
                          style={{ justifyContent: 'center', borderRadius: '12px', fontWeight: 700, fontSize: '0.85rem' }}
                        >
                          <CalendarPlus size={15} /> Book
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

    </div>
  );
};

export default Services;
