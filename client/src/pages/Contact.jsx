import React, { useState } from 'react';
import axios from 'axios';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { motion } from 'framer-motion';

import { API_URL } from '../config/api';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ text: 'Sending your inquiry...', type: 'info' });
    try {
      const res = await axios.post(`${API_URL}/contact`, formData);
      if (res.data.success) {
        setStatus({ text: 'Message sent successfully. We will be in touch.', type: 'success' });
        setFormData({ name: '', email: '', message: '' });
      }
    } catch (err) {
      setStatus({ text: 'Failed to send message. Please try again.', type: 'error' });
    }
  };

  return (
    <div className="page-wrapper container animate-fade-in">
      <header style={{ textAlign: 'center', marginBottom: '5rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '4rem', marginBottom: '1rem' }}>Get in Touch</h1>
        <p style={{ color: 'var(--text-subtle)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
          Have a question or need personalized assistance? Our dedicated concierge team is available around the clock.
        </p>
      </header>

      <div className="grid-layout grid-cols-1 md:grid-cols-2 gap-8" style={{ alignItems: 'start' }}>
        
        {/* Contact Info */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card"
        >
          <h3 style={{ fontSize: '1.75rem', marginBottom: '2.5rem' }}>Contact Information</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
              <div style={{ padding: '1.2rem', background: 'rgba(79, 70, 229, 0.1)', borderRadius: '16px', color: 'var(--primary)' }}>
                <MapPin size={28} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>University Campus</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>Lead City University Campus<br/>Toll-Gate Area, Ibadan, Oyo State</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
              <div style={{ padding: '1.2rem', background: 'rgba(124, 58, 237, 0.1)', borderRadius: '16px', color: 'var(--secondary)' }}>
                <Mail size={28} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>Official Support Email</strong>
                <a href="mailto:beatsnitro101@gmail.com" style={{ color: 'var(--primary)', fontSize: '0.95rem', textDecoration: 'none', fontWeight: 600 }}>beatsnitro101@gmail.com</a>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
              <div style={{ padding: '1.2rem', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '16px', color: '#d97706' }}>
                <Phone size={28} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>Help Desk Line</strong>
                <a href="tel:+2349162789976" style={{ color: 'var(--text-main)', fontSize: '0.95rem', textDecoration: 'none', fontWeight: 600 }}>+234 916 278 9976</a>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Contact Form */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.5 }}
          className="glass-card"
        >
          {status && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ 
              padding: '1rem', 
              borderRadius: '12px', 
              marginBottom: '1.5rem', 
              fontSize: '0.95rem',
              fontWeight: 500,
              background: status.type === 'success' ? 'var(--success-glow)' : status.type === 'error' ? 'var(--error-glow)' : 'rgba(255, 255, 255, 0.1)',
              color: status.type === 'success' ? 'var(--success)' : status.type === 'error' ? 'var(--error)' : 'var(--info)',
              border: `1px solid ${status.type === 'success' ? 'rgba(16,185,129,0.3)' : status.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.2)'}`
            }}>
              {status.text}
            </motion.div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="grid-layout grid-cols-1 md:grid-cols-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
              <div className="input-group">
                <label>Full Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="John Doe" />
              </div>
              <div className="input-group">
                <label>Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="john@example.com" />
              </div>
            </div>
            
            <div className="input-group">
              <label>Your Message</label>
              <textarea name="message" value={formData.message} onChange={handleChange} required rows="5" placeholder="How can we assist you today?"></textarea>
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              <Send size={18} /> Send Inquiry
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Contact;
