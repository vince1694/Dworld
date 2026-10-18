import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Calendar, 
  Star, 
  Award, 
  ShieldCheck, 
  Images, 
  CalendarPlus, 
  Briefcase, 
  ZoomIn, 
  Phone, 
  Sparkles,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import VerifiedBadge from '../components/VerifiedBadge';
import ImageLightboxModal from '../components/ImageLightboxModal';
import { API_URL } from '../config/api';

const ExpertProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [expert, setExpert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lightbox Modal state
  const [lightbox, setLightbox] = useState({
    isOpen: false,
    imageUrl: '',
    title: '',
    subtitle: ''
  });

  useEffect(() => {
    fetchExpertProfile();
  }, [id]);

  const fetchExpertProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch expert details
      const res = await axios.get(`${API_URL}/auth/experts/${id}`);
      if (res.data.success && res.data.data) {
        setExpert(res.data.data);
      } else {
        // Fallback: try finding in general /experts list
        const allRes = await axios.get(`${API_URL}/auth/experts`);
        const found = (allRes.data.data || []).find(e => String(e._id || e.id) === String(id));
        if (found) {
          setExpert(found);
        } else {
          setError('Specialist profile not found.');
        }
      }
    } catch (err) {
      console.warn('Direct expert fetch failed, trying list fallback:', err);
      try {
        const allRes = await axios.get(`${API_URL}/auth/experts`);
        const found = (allRes.data.data || []).find(e => String(e._id || e.id) === String(id));
        if (found) {
          setExpert(found);
        } else {
          setError('Specialist not found or profile is unavailable.');
        }
      } catch (e) {
        setError('Failed to load expert professional page.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openLightbox = (imageUrl, title = 'Lookbook Photo', subtitle = 'Style Preview') => {
    if (!imageUrl) return;
    setLightbox({
      isOpen: true,
      imageUrl,
      title,
      subtitle
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '48px', height: '48px', border: '3px solid rgba(79, 70, 229, 0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600 }}>Loading specialist professional profile...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !expert) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
          <UserCheck size={32} />
        </div>
        <h2 style={{ fontFamily: 'Outfit', fontSize: '1.4rem', color: 'var(--text-main)', margin: '0 0 0.5rem' }}>Specialist Profile Unavailable</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 0 1.5rem' }}>
          {error || 'We could not locate this specialist in the verified campus database.'}
        </p>
        <button 
          onClick={() => navigate('/services?tab=experts')}
          className="btn btn-primary"
          style={{ padding: '0.65rem 1.35rem' }}
        >
          <ArrowLeft size={16} /> Back to Verified Specialists
        </button>
      </div>
    );
  }

  const expertId = String(expert._id || expert.id);
  // Limit to max 3 photos as requested
  const lookbookPhotos = (expert.portfolio || []).slice(0, 3);
  const services = expert.services || [];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '5rem' }}>
      {/* Lightbox Modal */}
      <ImageLightboxModal 
        isOpen={lightbox.isOpen}
        onClose={() => setLightbox(prev => ({ ...prev, isOpen: false }))}
        imageUrl={lightbox.imageUrl}
        title={lightbox.title}
        subtitle={lightbox.subtitle}
      />

      {/* Top Back Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button 
          type="button"
          onClick={() => navigate(-1)}
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.95rem', fontSize: '0.825rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <ArrowLeft size={15} /> Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            padding: '0.25rem 0.65rem', 
            borderRadius: '9999px', 
            background: '#dcfce7', 
            border: '1px solid #bbf7d0', 
            color: '#15803d', 
            fontSize: '0.75rem', 
            fontWeight: 700 
          }}>
            <ShieldCheck size={13} /> Verified LCU Specialist
          </span>
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            padding: '0.25rem 0.65rem', 
            borderRadius: '9999px', 
            background: 'rgba(79, 70, 229, 0.1)', 
            border: '1px solid rgba(79, 70, 229, 0.25)', 
            color: 'var(--primary)', 
            fontSize: '0.75rem', 
            fontWeight: 700 
          }}>
            ⚡ Activation Paid
          </span>
        </div>
      </div>

      {/* ── HERO PROFILE BANNER ── */}
      <div className="bento-card" style={{ 
        position: 'relative', 
        padding: '2rem 1.75rem', 
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(124, 58, 237, 0.08), rgba(2, 132, 199, 0.06))', 
        borderColor: 'rgba(79, 70, 229, 0.2)',
        borderRadius: '20px',
        overflow: 'hidden',
        marginBottom: '1.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* Avatar with click to view lightbox */}
          <div 
            onClick={() => expert.avatar && openLightbox(expert.avatar, expert.name, `${expert.specialty || 'Campus Specialist'} • Verified Avatar`)}
            style={{ 
              position: 'relative', 
              width: '96px', 
              height: '96px', 
              borderRadius: '24px', 
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
              color: 'white',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '2.4rem', 
              fontWeight: 800, 
              fontFamily: 'Outfit',
              boxShadow: '0 10px 28px rgba(79, 70, 229, 0.3)',
              overflow: 'hidden',
              flexShrink: 0,
              cursor: expert.avatar ? 'zoom-in' : 'default',
              border: '3px solid #ffffff'
            }}
            title={expert.avatar ? "Tap to view profile picture in full HD" : expert.name}
          >
            {expert.avatar ? (
              <img 
                src={expert.avatar} 
                alt={expert.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              expert.name ? expert.name.charAt(0).toUpperCase() : 'E'
            )}

            {expert.avatar && (
              <span style={{
                position: 'absolute',
                bottom: '4px',
                right: '4px',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '50%',
                width: '22px',
                height: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <ZoomIn size={12} />
              </span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.4rem, 4vw, 1.85rem)', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--text-main)' }}>
                {expert.name}
              </h1>
              <VerifiedBadge size="medium" text="OFFICIAL LCU SPECIALIST" />
            </div>

            <p style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Award size={16} /> {expert.specialty || 'Lead City University Specialist'}
            </p>

            {/* Address & Hours details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
              {/* Expert Address */}
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.45rem', 
                background: '#ecfdf5', 
                border: '1px solid #a7f3d0', 
                color: '#065f46', 
                padding: '0.35rem 0.75rem', 
                borderRadius: '8px', 
                fontSize: '0.825rem', 
                fontWeight: 700,
                width: 'fit-content'
              }}>
                <MapPin size={15} color="#059669" />
                <span>Address: <strong>{expert.address || expert.location || 'Lead City University Campus, Ibadan'}</strong></span>
              </div>

              {/* Working Hours */}
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.45rem', 
                color: 'var(--text-muted)', 
                fontSize: '0.8rem', 
                marginTop: '0.2rem' 
              }}>
                <Clock size={14} />
                <span>
                  Hours: {expert.workingHours?.start || '09:00'} - {expert.workingHours?.end || '18:00'} ({Array.isArray(expert.workingDays) ? expert.workingDays.slice(0, 3).join(', ') + '...' : 'Mon - Sat'})
                </span>
                <span style={{ margin: '0 0.25rem' }}>•</span>
                <span style={{ color: '#f59e0b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Star size={13} fill="#f59e0b" /> {expert.rating || 5.0} Rating
                </span>
              </div>
            </div>
          </div>

          {/* Quick Book CTA Button in Hero */}
          <div style={{ alignSelf: 'center' }}>
            <button
              type="button"
              onClick={() => navigate(`/book?expertId=${expertId}`)}
              className="btn btn-primary"
              style={{ padding: '0.85rem 1.75rem', fontSize: '0.95rem', fontWeight: 800, borderRadius: '14px', boxShadow: '0 8px 24px rgba(79, 70, 229, 0.3)' }}
            >
              <CalendarPlus size={18} /> Book Appointment
            </button>
          </div>
        </div>

        {/* Bio / About */}
        {expert.bio && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.1rem', borderTop: '1px solid rgba(79, 70, 229, 0.12)' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
              ABOUT THIS SPECIALIST
            </span>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
              {expert.bio}
            </p>
          </div>
        )}
      </div>

      {/* ── LOOKBOOK PICTURES (MAX 3 WORKS) ── */}
      <div className="bento-card" style={{ padding: '1.75rem', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.12)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Images size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontFamily: 'Outfit' }}>
                Featured Lookbook & Works
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Top 3 showcase photos of styles and appointments done by {expert.name.split(' ')[0]}
              </p>
            </div>
          </div>

          <span style={{ 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            padding: '0.25rem 0.65rem', 
            borderRadius: '9999px', 
            background: 'rgba(168, 85, 247, 0.1)', 
            color: 'var(--secondary)' 
          }}>
            {lookbookPhotos.length} / 3 Works Showcase
          </span>
        </div>

        {lookbookPhotos.length > 0 ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: '1rem' 
          }}>
            {lookbookPhotos.map((photo, index) => {
              const photoUrl = photo.imageUrl || photo;
              const photoTitle = photo.title || `Work Sample #${index + 1}`;
              const photoCat = photo.category || expert.specialty || 'Hair Styling';

              return (
                <div
                  key={photo._id || index}
                  onClick={() => openLightbox(photoUrl, photoTitle, `${photoCat} • By ${expert.name}`)}
                  style={{
                    position: 'relative',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: 'var(--bg-input, #0f172a)',
                    border: '1px solid var(--border-light)',
                    height: '240px',
                    cursor: 'zoom-in',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.18)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                  }}
                >
                  <img
                    src={photoUrl}
                    alt={photoTitle}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />

                  {/* Gradient Overlay & Details */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '1rem',
                    color: '#ffffff'
                  }}>
                    <span style={{ 
                      fontSize: '0.68rem', 
                      fontWeight: 800, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.06em', 
                      color: 'var(--secondary-light, #c084fc)',
                      marginBottom: '0.2rem' 
                    }}>
                      {photoCat}
                    </span>
                    <strong style={{ fontSize: '0.95rem', fontFamily: 'Outfit', lineHeight: 1.2 }}>
                      {photoTitle}
                    </strong>
                    <span style={{ fontSize: '0.7rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.35rem' }}>
                      <ZoomIn size={12} /> Tap to zoom HD
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px dashed var(--border-light)' }}>
            <Images size={36} style={{ opacity: 0.3, marginBottom: '0.65rem' }} />
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
              No lookbook pictures uploaded yet
            </p>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              This specialist will upload highlight pictures of their styles and client works soon.
            </p>
          </div>
        )}
      </div>

      {/* ── REGISTERED SERVICES OFFERED ── */}
      <div className="bento-card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(79, 70, 229, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontFamily: 'Outfit' }}>
                Services Offered & Pricing
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Select any registered service to book directly with {expert.name.split(' ')[0]}
              </p>
            </div>
          </div>

          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            {services.length} {services.length === 1 ? 'Service' : 'Services'} Available
          </span>
        </div>

        {services.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {services.map(srv => {
              const srvId = String(srv._id || srv.id);
              const price = Number(srv.price || 3500);
              const duration = Number(srv.duration || 45);

              return (
                <div 
                  key={srvId}
                  style={{
                    padding: '1.15rem 1.25rem',
                    borderRadius: '16px',
                    background: 'var(--bg-card, #ffffff)',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    transition: 'all 0.2s ease'
                  }}
                  className="hover-card-select"
                >
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>
                        {srv.name}
                      </strong>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', background: 'rgba(79,70,229,0.1)', color: 'var(--primary)' }}>
                        {srv.category || 'Specialist Service'}
                      </span>
                    </div>
                    {srv.description && (
                      <p style={{ margin: '0 0 0.4rem', fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {srv.description}
                      </p>
                    )}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={13} /> {duration} minutes session
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>PRICE</span>
                      <strong style={{ fontSize: '1.25rem', color: 'var(--secondary)', fontFamily: 'Outfit' }}>
                        ₦{price.toLocaleString()}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/book?expertId=${expertId}&serviceId=${srvId}`)}
                      className="btn btn-primary"
                      style={{ padding: '0.65rem 1.15rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '12px' }}
                    >
                      Book This Service
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Briefcase size={36} style={{ opacity: 0.3, marginBottom: '0.65rem' }} />
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>Custom Service Consultation</p>
            <p style={{ margin: '0.3rem 0 1rem', fontSize: '0.8rem' }}>
              Tap below to schedule a general appointment with {expert.name}.
            </p>
            <button
              onClick={() => navigate(`/book?expertId=${expertId}`)}
              className="btn btn-primary"
            >
              <CalendarPlus size={16} /> Book Appointment
            </button>
          </div>
        )}
      </div>

      {/* ── STICKY BOTTOM QUICK-BOOK CTA ── */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '0.85rem 1.5rem',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', background: 'var(--primary)', flexShrink: 0 }}>
            {expert.avatar ? (
              <img src={expert.avatar} alt={expert.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                {expert.name ? expert.name.charAt(0) : 'E'}
              </span>
            )}
          </div>
          <div>
            <strong style={{ color: '#ffffff', fontSize: '0.9rem', display: 'block', fontFamily: 'Outfit' }}>
              Book {expert.name}
            </strong>
            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
              📍 {expert.address || expert.location || 'Lead City University'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/book?expertId=${expertId}`)}
          className="btn btn-primary"
          style={{ padding: '0.75rem 1.75rem', fontWeight: 800, borderRadius: '12px', fontSize: '0.9rem' }}
        >
          <CalendarPlus size={16} /> Book Appointment Now
        </button>
      </div>
    </div>
  );
};

export default ExpertProfilePage;
