import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, AlertCircle, Phone, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'customer'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if ((formData.role === 'expert' || formData.role === 'stylist') && (!formData.newServices || formData.newServices.length === 0)) {
      setError('Please select your single service specialty.');
      return;
    }

    setLoading(true);
    try {
      const user = await register(formData);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'expert' || user.role === 'stylist') navigate('/expert');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper flex-center animate-fade-in" style={{ padding: '2rem 1rem' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="auth-card" 
        style={{ width: '100%', maxWidth: '450px' }}
      >
        <div className="card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1.75rem 2rem 1.25rem 2rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.35rem', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>Create an account</h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Join D.world to book or provide services</p>
        </div>

        <div className="card-body" style={{ padding: '2rem' }}>
          {error && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '0.85rem 1.25rem', borderRadius: '9999px', marginBottom: '1.5rem', 
              display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', fontWeight: 500
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="name">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                <input 
                  id="name" name="name" type="text" placeholder="John Doe" 
                  value={formData.name} onChange={handleChange} required style={{ paddingLeft: '3rem' }}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                <input 
                  id="email" name="email" type="email" placeholder="name@example.com" 
                  value={formData.email} onChange={handleChange} required style={{ paddingLeft: '3rem' }}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="phone">Phone Number (Optional)</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                <input 
                  id="phone" name="phone" type="text" placeholder="+1 (555) 000-0000" 
                  value={formData.phone} onChange={handleChange} style={{ paddingLeft: '3rem' }}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="matricNo">LCU Matriculation Number</label>
              <div style={{ position: 'relative' }}>
                <ShieldCheck size={16} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                <input 
                  id="matricNo" name="matricNo" type="text" placeholder="LCU/UG/22/04521" 
                  value={formData.matricNo || ''} onChange={handleChange} 
                  required={(formData.role === 'user' || formData.role === 'customer')}
                  style={{ paddingLeft: '3rem', textTransform: 'uppercase' }}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
                Accepted format: LCU/UG/00/00000 (lowercase or uppercase)
              </span>
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                <input 
                  id="password" name="password" type="password" placeholder="••••••••" 
                  value={formData.password} onChange={handleChange} required minLength="6" style={{ paddingLeft: '3rem' }}
                />
              </div>
            </div>

            <div className="input-group">
              <label style={{ marginBottom: '0.75rem', display: 'block' }}>Select Account Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div 
                  onClick={() => setFormData({ ...formData, role: 'user' })}
                  style={{
                    padding: '0.85rem 0.75rem',
                    borderRadius: '14px',
                    border: (formData.role === 'user' || formData.role === 'customer') ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                    background: (formData.role === 'user' || formData.role === 'customer') ? 'rgba(79, 70, 229, 0.08)' : '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '0.2rem' }}>👤</span>
                  <strong style={{ fontSize: '0.875rem', display: 'block', color: 'var(--text-main)', fontFamily: 'Outfit' }}>Client Account</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Book appointments & services</span>
                </div>

                <div 
                  onClick={() => setFormData({ ...formData, role: 'expert' })}
                  style={{
                    padding: '0.85rem 0.75rem',
                    borderRadius: '14px',
                    border: (formData.role === 'expert' || formData.role === 'stylist') ? '2px solid var(--secondary)' : '1px solid var(--border-light)',
                    background: (formData.role === 'expert' || formData.role === 'stylist') ? 'rgba(124, 58, 237, 0.08)' : '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '0.2rem' }}>⚡</span>
                  <strong style={{ fontSize: '0.875rem', display: 'block', color: 'var(--text-main)', fontFamily: 'Outfit' }}>Service Expert</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Provide & manage services</span>
                </div>
              </div>
            </div>

            {/* EXPERT PRIMARY SINGLE SERVICE SELECTION (1 EXPERT = 1 SERVICE) */}
            {(formData.role === 'expert' || formData.role === 'stylist') && (
              <div className="input-group" style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ margin: 0, color: 'var(--secondary)', fontWeight: 800, fontSize: '0.9rem' }}>
                    ⚡ Your Single Service Specialty
                  </label>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '6px', background: (formData.newServices && formData.newServices.length === 1) ? '#dcfce7' : '#fee2e2', color: (formData.newServices && formData.newServices.length === 1) ? '#15803d' : '#b91c1c' }}>
                    {(formData.newServices && formData.newServices.length === 1) ? '✓ 1 Selected' : 'Required'}
                  </span>
                </div>
                <p style={{ margin: '0 0 0.85rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                  Each expert specializes in exactly 1 single service on D.world. Choose yours:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {[
                    { name: 'Nails', description: 'Classic nail care, shaping, and polish.', price: 2500, duration: 30, type: 'single', category: 'Nails' },
                    { name: 'Lash Extensions', description: 'Classic full set lash extensions.', price: 4000, duration: 45, type: 'single', category: 'Lashes' },
                    { name: 'Hair Braiding', description: 'Neat campus hair braiding and styling.', price: 5000, duration: 90, type: 'single', category: 'Hair' },
                    { name: 'Wig Installation', description: 'Professional wig install and melt.', price: 6000, duration: 60, type: 'single', category: 'Hair' },
                    { name: 'Frontal Installation', description: 'Custom frontal wig placement and styling.', price: 7500, duration: 75, type: 'single', category: 'Hair' },
                    { name: 'Wig Revamping', description: 'Wig wash, deep conditioning, and restyling.', price: 4500, duration: 60, type: 'single', category: 'Hair' },
                    { name: 'Hair Tinting', description: 'Vibrant hair color tinting and treatment.', price: 4000, duration: 45, type: 'single', category: 'Hair' },
                    { name: 'Makeup', description: 'Professional full face glam makeup.', price: 5000, duration: 50, type: 'single', category: 'Makeup' },
                    { name: 'Male Haircut / Barbering', description: 'Precision male haircut and line-up.', price: 3000, duration: 30, type: 'single', category: 'Barbering' },
                    { name: 'Male Hair Braiding', description: 'Neat male cornrows and braided styles.', price: 4500, duration: 60, type: 'single', category: 'Hair' },
                    { name: 'Hair Styling', description: 'Blowout, press, curling, and updos.', price: 3500, duration: 45, type: 'single', category: 'Hair' },
                    { name: 'Hair Treatment', description: 'Deep scalp conditioning and moisture therapy.', price: 3500, duration: 40, type: 'single', category: 'Hair' },
                    { name: 'Manicure', description: 'Nail trim, cuticle care, and hand massage.', price: 2500, duration: 30, type: 'single', category: 'Nails' },
                    { name: 'Pedicure', description: 'Exfoliating foot soak, nail trim, and massage.', price: 3500, duration: 45, type: 'single', category: 'Nails' },
                    { name: 'Facial', description: 'Deep cleansing facial treatment and glow mask.', price: 5000, duration: 45, type: 'single', category: 'Skincare' },
                    { name: 'Eyebrow Grooming', description: 'Precision eyebrow shaping, threading, or waxing.', price: 1500, duration: 20, type: 'single', category: 'Grooming' },
                    { name: 'Waxing', description: 'Smooth body or facial hair removal waxing.', price: 3500, duration: 30, type: 'single', category: 'Skincare' },
                    { name: 'Massage', description: 'Relaxing full body or neck & shoulder massage.', price: 6000, duration: 45, type: 'single', category: 'Wellness' }
                  ].map(svc => {
                    const isSelected = (formData.newServices || []).some(s => s.name === svc.name);
                    return (
                      <label 
                        key={svc.name} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.65rem', 
                          padding: '0.55rem 0.75rem', 
                          borderRadius: '10px', 
                          background: isSelected ? 'rgba(124, 58, 237, 0.08)' : '#ffffff', 
                          border: isSelected ? '2px solid var(--secondary)' : '1px solid var(--border-light)', 
                          cursor: 'pointer', 
                          fontSize: '0.825rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="radio"
                          name="expertServiceRadio"
                          checked={isSelected}
                          onChange={() => {
                            setError('');
                            setFormData({ ...formData, newServices: [svc] });
                          }}
                        />
                        <span style={{ fontWeight: isSelected ? 700 : 500, color: 'var(--text-main)', flex: 1 }}>{svc.name}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{svc.duration}m</span>
                        <strong style={{ color: 'var(--secondary)' }}>₦{svc.price.toLocaleString()}</strong>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <button 
              type="submit" className="btn btn-primary" 
              style={{ width: '100%', padding: '0.75rem 1.5rem', marginTop: '0.75rem', fontSize: '0.95rem' }} disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <div className="card-footer" style={{ justifyContent: 'center', padding: '1.25rem 2rem' }}>
          <span style={{ color: 'var(--text-subtle)', fontSize: '0.9rem' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', marginLeft: '0.5rem' }}>Sign in</Link>
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
