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
  Users
} from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
  const { user } = useAuth();
  return (
    <div className="page-wrapper animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
      
      {/* Clean Modern Hero Section */}
      <header style={{ 
        padding: '6rem 2rem 5rem', 
        textAlign: 'center', 
        minHeight: '75vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.08), transparent 50%)',
        borderBottom: '1px solid var(--border-light)',
        position: 'relative'
      }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ maxWidth: '820px', margin: '0 auto', zIndex: 2 }}
        >
          <span style={{ 
            color: 'var(--primary)', 
            fontWeight: 600, 
            fontSize: '0.85rem', 
            marginBottom: '1.25rem', 
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(99, 102, 241, 0.08)',
            padding: '0.35rem 1rem',
            borderRadius: '9999px',
            border: '1px solid rgba(99, 102, 241, 0.15)'
          }}>
            <CalendarClock size={15} /> Appointment Management Platform
          </span>
          
          <h1 style={{ 
            fontSize: 'clamp(2.4rem, 6vw, 4rem)', 
            marginBottom: '1.25rem', 
            lineHeight: '1.15', 
            letterSpacing: '-0.03em', 
            color: 'var(--text-main)',
            fontFamily: 'Outfit'
          }}>
            Simple, seamless booking for <br />
            <span className="text-gradient">clients and professionals</span>
          </h1>
          
          <p style={{ 
            fontSize: '1.15rem', 
            color: 'var(--text-muted)', 
            maxWidth: '620px', 
            margin: '0 auto 2.5rem',
            lineHeight: '1.6'
          }}>
            D.WORLD connects specialists and clients with real-time schedule availability. Book appointments, manage calendars, and keep operations organized.
          </p>

          <div className="flex-center gap-4" style={{ flexWrap: 'wrap' }}>
            <Link to={user ? (user.role === 'admin' ? '/admin' : user.role === 'expert' ? '/expert' : '/dashboard') : '/register'} className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '0.95rem' }}>
              {user ? 'Go to Dashboard' : 'Get Started'} <ArrowRight size={17} />
            </Link>
            <Link to={user ? "/services" : "/login"} className="btn btn-secondary" style={{ padding: '0.85rem 2rem', fontSize: '0.95rem' }}>
              Explore Services
            </Link>
          </div>
        </motion.div>
      </header>

      {/* Feature Showcase Grid */}
      <section id="services" className="container" style={{ padding: '5rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '0.75rem', fontFamily: 'Outfit' }}>
            Designed for Effortless Scheduling
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto' }}>
            Everything you need to discover services, pick time slots, and manage reservations.
          </p>
        </div>

        <div className="grid-layout grid-cols-1 md:grid-cols-3" style={{ gap: '1.75rem' }}>
          <FeatureCard 
            icon={<CalendarClock size={24} color="var(--primary)" />}
            title="Real-Time Time Slots"
            description="Select available time slots instantly without overlapping calendars or scheduling conflicts."
          />
          <FeatureCard 
            icon={<Users size={24} color="var(--secondary)" />}
            title="Specialist Profiles"
            description="Browse services provided by qualified experts with clear pricing and session duration details."
          />
          <FeatureCard 
            icon={<LayoutDashboard size={24} color="var(--accent)" />}
            title="Dedicated Dashboards"
            description="Tailored workspace dashboards for Clients, Experts, and System Administrators."
          />
        </div>
      </section>

      {/* Simple 3-Step Process */}
      <section style={{ background: 'var(--nav-bg)', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="container" style={{ padding: '5rem 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2.2rem', marginBottom: '0.75rem', fontFamily: 'Outfit' }}>How It Works</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>Book your next appointment in three steps.</p>
          </div>
          
          <div className="grid-layout grid-cols-1 md:grid-cols-3" style={{ gap: '2rem', textAlign: 'center' }}>
            <StepCard 
              step="1"
              icon={<UserPlus size={26} />}
              title="Create an Account"
              description="Register as a client or specialist to access your personalized scheduling portal."
            />
            <StepCard 
              step="2"
              icon={<Search size={26} />}
              title="Choose Service & Slot"
              description="Browse the catalog, pick a date, and select an available time slot."
            />
            <StepCard 
              step="3"
              icon={<CalendarCheck size={26} />}
              title="Instant Confirmation"
              description="Receive instant booking approval and track your appointment status in real-time."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '3.5rem 1.5rem 2.5rem', textAlign: 'center', borderTop: '1px solid var(--border-light)', background: 'var(--bg-main)' }}>
        <div style={{ 
          fontFamily: 'Outfit',
          fontSize: '1.4rem',
          fontWeight: 900,
          color: 'var(--text-main)',
          marginBottom: '0.5rem',
          letterSpacing: '-0.02em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></span>
          D.WORLD
        </div>
        <p style={{ color: 'var(--text-subtle)', fontSize: '0.875rem' }}>&copy; 2026 D.WORLD. All rights reserved.</p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="app-card" style={{ padding: '2rem 1.5rem' }}>
    <div style={{ 
      width: '46px', 
      height: '46px', 
      background: 'rgba(255, 255, 255, 0.03)', 
      border: '1px solid var(--border-light)',
      borderRadius: '12px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      marginBottom: '1.25rem'
    }}>
      {icon}
    </div>
    <h3 style={{ marginBottom: '0.5rem', fontSize: '1.15rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>{title}</h3>
    <p style={{ color: 'var(--text-muted)', lineHeight: '1.5', fontSize: '0.9rem' }}>{description}</p>
  </div>
);

const StepCard = ({ step, icon, title, description }) => (
  <div style={{ padding: '1rem' }}>
    <div style={{ 
      margin: '0 auto 1.25rem', 
      width: '56px',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(99, 102, 241, 0.1)',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      borderRadius: '50%',
      color: 'var(--primary)'
    }}>
      {icon}
    </div>
    <div style={{ 
      color: 'var(--primary)', 
      fontWeight: 800, 
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      marginBottom: '0.35rem'
    }}>Step {step}</div>
    <h3 style={{ marginBottom: '0.5rem', fontSize: '1.15rem', fontFamily: 'Outfit' }}>{title}</h3>
    <p style={{ color: 'var(--text-muted)', lineHeight: '1.5', fontSize: '0.9rem' }}>{description}</p>
  </div>
);

export default Home;
