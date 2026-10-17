import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  CalendarClock, 
  ShieldCheck, 
  LayoutDashboard, 
  ArrowRight, 
  UserPlus, 
  Search, 
  CalendarCheck, 
  Clock,
  CheckCircle2,
  Users,
  Sparkles,
  Star,
  MapPin,
  Heart
} from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
  const { user } = useAuth();
  return (
    <div className="page-wrapper animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
      
      {/* ── Enhanced Hero Section ─────────────────────── */}
      <header style={{ 
        padding: '7rem 2rem 6rem', 
        textAlign: 'center', 
        minHeight: '80vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated gradient mesh background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 50% at 50% 20%, rgba(79, 70, 229, 0.08), transparent 60%), radial-gradient(ellipse 60% 40% at 80% 60%, rgba(124, 58, 237, 0.06), transparent 50%), radial-gradient(ellipse 50% 30% at 20% 70%, rgba(236, 72, 153, 0.04), transparent 50%)',
          zIndex: 0
        }} />
        {/* Decorative floating orbs */}
        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '15%', left: '10%',
            width: 200, height: 200,
            background: 'radial-gradient(circle, rgba(79, 70, 229, 0.12), transparent 70%)',
            borderRadius: '50%', filter: 'blur(40px)', zIndex: 0
          }}
        />
        <motion.div
          animate={{ y: [0, 15, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          style={{
            position: 'absolute', bottom: '20%', right: '8%',
            width: 260, height: 260,
            background: 'radial-gradient(circle, rgba(124, 58, 237, 0.1), transparent 70%)',
            borderRadius: '50%', filter: 'blur(50px)', zIndex: 0
          }}
        />

        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: '820px', margin: '0 auto', zIndex: 2, position: 'relative' }}
        >
          <motion.span 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            style={{ 
              color: 'var(--primary)', 
              fontWeight: 600, 
              fontSize: '0.85rem', 
              marginBottom: '1.5rem', 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(79, 70, 229, 0.06)',
              padding: '0.4rem 1.1rem',
              borderRadius: '9999px',
              border: '1px solid rgba(79, 70, 229, 0.12)'
            }}
          >
            <Sparkles size={14} /> Campus Beauty & Styling Platform
          </motion.span>
          
          <h1 style={{ 
            fontSize: 'clamp(2.4rem, 6vw, 4rem)', 
            marginBottom: '1.25rem', 
            lineHeight: '1.1', 
            letterSpacing: '-0.035em', 
            color: 'var(--text-main)',
            fontFamily: 'Outfit'
          }}>
            Book your ideal expert{' '}
            <span className="text-gradient">with confidence</span>
          </h1>
          
          <p style={{ 
            fontSize: '1.15rem', 
            color: 'var(--text-muted)', 
            maxWidth: '600px', 
            margin: '0 auto 2.75rem',
            lineHeight: '1.65'
          }}>
            D.WORLD connects you with verified campus beauty specialists — browse services, compare experts, and book appointments in seconds.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <Link 
              to={user ? (user.role === 'admin' ? '/admin' : user.role === 'expert' ? '/expert' : '/dashboard') : '/register'} 
              className="btn btn-primary" 
              style={{ padding: '0.9rem 2.25rem', fontSize: '0.95rem', fontWeight: 700, borderRadius: '14px', boxShadow: '0 8px 24px rgba(79, 70, 229, 0.3)' }}
            >
              {user ? 'Go to Dashboard' : 'Get Started Free'} <ArrowRight size={17} />
            </Link>
            <Link 
              to={user ? "/services" : "/login"} 
              className="btn btn-secondary" 
              style={{ padding: '0.9rem 2.25rem', fontSize: '0.95rem', fontWeight: 600, borderRadius: '14px' }}
            >
              Explore Services
            </Link>
          </div>

          {/* Social proof strip */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            style={{ 
              marginTop: '3.5rem',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '2rem',
              flexWrap: 'wrap',
              color: 'var(--text-subtle)',
              fontSize: '0.85rem'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={15} color="var(--success)" /> Verified Experts
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={15} color="var(--secondary)" /> Location-Based Discovery
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Star size={15} color="var(--accent)" /> Real Reviews
            </span>
          </motion.div>
        </motion.div>
      </header>

      {/* ── Feature Showcase Grid ─────────────────────── */}
      <section id="services" className="container" style={{ padding: '5rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '0.75rem', fontFamily: 'Outfit', letterSpacing: '-0.025em' }}>
            Everything You Need
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '560px', margin: '0 auto' }}>
            Find services, discover nearby specialists, and manage your bookings — all in one place.
          </p>
        </div>

        <div className="grid-layout grid-cols-1 md:grid-cols-3" style={{ gap: '1.5rem' }}>
          <FeatureCard 
            icon={<CalendarClock size={24} />}
            color="var(--primary)"
            bg="rgba(79, 70, 229, 0.08)"
            title="Real-Time Scheduling"
            description="Pick available time slots instantly. No overlapping calendars or scheduling conflicts."
          />
          <FeatureCard 
            icon={<Users size={24} />}
            color="var(--secondary)"
            bg="rgba(124, 58, 237, 0.08)"
            title="Verified Specialists"
            description="Browse profiles of campus beauty experts with ratings, pricing, and location details."
          />
          <FeatureCard 
            icon={<LayoutDashboard size={24} />}
            color="var(--accent)"
            bg="rgba(245, 158, 11, 0.08)"
            title="Personal Dashboard"
            description="Track bookings, manage your wallet, chat with experts, and review past sessions."
          />
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────── */}
      <section style={{ 
        background: 'linear-gradient(180deg, var(--bg-main) 0%, #ffffff 100%)', 
        borderTop: '1px solid var(--border-light)', 
        borderBottom: '1px solid var(--border-light)' 
      }}>
        <div className="container" style={{ padding: '5rem 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2.2rem', marginBottom: '0.75rem', fontFamily: 'Outfit', letterSpacing: '-0.025em' }}>How It Works</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>Book your next appointment in three simple steps.</p>
          </div>
          
          <div className="grid-layout grid-cols-1 md:grid-cols-3" style={{ gap: '2rem', textAlign: 'center' }}>
            <StepCard 
              step="1"
              icon={<UserPlus size={26} />}
              title="Create an Account"
              description="Register as a client or specialist and set up your personalized profile."
            />
            <StepCard 
              step="2"
              icon={<Search size={26} />}
              title="Find & Choose"
              description="Browse experts, compare services, pick a date and available time slot."
            />
            <StepCard 
              step="3"
              icon={<CalendarCheck size={26} />}
              title="Book & Confirm"
              description="Receive instant booking confirmation and track your appointment status live."
            />
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <footer style={{ 
        padding: '3.5rem 1.5rem 2.5rem', 
        textAlign: 'center', 
        borderTop: '1px solid var(--border-light)', 
        background: 'var(--bg-main)' 
      }}>
        <div style={{ 
          fontFamily: 'Outfit',
          fontSize: '1.5rem',
          fontWeight: 900,
          color: 'var(--text-main)',
          marginBottom: '0.75rem',
          letterSpacing: '-0.025em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ 
            width: '10px', height: '10px', borderRadius: '50%', 
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            boxShadow: '0 0 8px rgba(79, 70, 229, 0.4)'
          }}></span>
          D.WORLD
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '1.5rem', 
          marginBottom: '1.25rem',
          flexWrap: 'wrap'
        }}>
          <Link to="/services" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Services</Link>
          <Link to="/contact" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Contact</Link>
          <Link to="/register" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Sign Up</Link>
        </div>
        <p style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>
          &copy; {new Date().getFullYear()} D.WORLD — Campus Beauty & Styling Platform. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, color, bg, title, description }) => (
  <motion.div 
    className="app-card" 
    style={{ padding: '2rem 1.75rem' }}
    whileHover={{ y: -4, boxShadow: '0 12px 32px -8px rgba(15, 23, 42, 0.12)' }}
    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
  >
    <div style={{ 
      width: '50px', 
      height: '50px', 
      background: bg,
      borderRadius: '14px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      marginBottom: '1.25rem',
      color: color,
      boxShadow: `0 4px 12px ${bg}`
    }}>
      {icon}
    </div>
    <h3 style={{ marginBottom: '0.5rem', fontSize: '1.15rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>{title}</h3>
    <p style={{ color: 'var(--text-muted)', lineHeight: '1.55', fontSize: '0.9rem' }}>{description}</p>
  </motion.div>
);

const StepCard = ({ step, icon, title, description }) => (
  <motion.div 
    style={{ padding: '1rem' }}
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: (parseInt(step) - 1) * 0.15, duration: 0.4 }}
  >
    <div style={{ 
      margin: '0 auto 1.25rem', 
      width: '60px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(124, 58, 237, 0.08))',
      border: '1.5px solid rgba(79, 70, 229, 0.15)',
      borderRadius: '50%',
      color: 'var(--primary)',
      boxShadow: '0 4px 16px rgba(79, 70, 229, 0.1)'
    }}>
      {icon}
    </div>
    <div style={{ 
      color: 'var(--primary)', 
      fontWeight: 800, 
      fontSize: '0.7rem',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom: '0.4rem',
      fontFamily: 'Inter'
    }}>Step {step}</div>
    <h3 style={{ marginBottom: '0.5rem', fontSize: '1.15rem', fontFamily: 'Outfit' }}>{title}</h3>
    <p style={{ color: 'var(--text-muted)', lineHeight: '1.55', fontSize: '0.9rem' }}>{description}</p>
  </motion.div>
);

export default Home;
