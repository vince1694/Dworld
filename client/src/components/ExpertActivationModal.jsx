import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, CheckCircle2, CreditCard, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config/api';

const PAYSTACK_FALLBACK_KEY = 'pk_live_060e4958254697673bb978c4a4df3694fae9099b';

const ExpertActivationModal = ({ isOpen, user, onActivated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen || !user) return null;

  const handlePayActivation = async () => {
    setError('');
    setLoading(true);

    try {
      // 1. Fetch public key configuration from backend
      let publicKey = PAYSTACK_FALLBACK_KEY;
      try {
        const configRes = await axios.get(`${API_URL}/payments/config`);
        if (configRes.data.success && configRes.data.publicKey) {
          publicKey = configRes.data.publicKey;
        }
      } catch (e) {
        console.warn('Using fallback Paystack key', e);
      }

      // 2. Check if PaystackPop inline script is loaded in window
      if (typeof window.PaystackPop !== 'undefined') {
        const handler = window.PaystackPop.setup({
          key: publicKey,
          email: user.email,
          amount: 3000 * 100, // ₦3,000 in kobo
          currency: 'NGN',
          ref: 'ACT-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          metadata: {
            custom_fields: [
              {
                display_name: 'Expert Name',
                variable_name: 'expert_name',
                value: user.name
              },
              {
                display_name: 'Purpose',
                variable_name: 'purpose',
                value: 'expert_activation'
              }
            ],
            purpose: 'expert_activation',
            user_id: user.id || user._id
          },
          callback: async (response) => {
            try {
              // Verify on server
              const verifyRes = await axios.post(`${API_URL}/payments/verify`, {
                reference: response.reference
              });

              if (verifyRes.data.success) {
                setSuccess(true);
                setTimeout(() => {
                  if (onActivated) onActivated();
                }, 1800);
              } else {
                setError(verifyRes.data.message || 'Payment verification failed');
              }
            } catch (err) {
              setError(err.response?.data?.message || 'Server verification failed');
            } finally {
              setLoading(false);
            }
          },
          onClose: () => {
            setLoading(false);
          }
        });

        handler.openIframe();
      } else {
        // Fallback: Initialize via server redirect
        const initRes = await axios.post(`${API_URL}/payments/initialize`, {
          amount: 3000,
          purpose: 'expert_activation'
        });

        if (initRes.data.success && initRes.data.data.authorization_url) {
          window.location.href = initRes.data.data.authorization_url;
        } else {
          setError('Could not initialize Paystack checkout. Please try again.');
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Paystack activation error:', err);
      setError(err.response?.data?.message || 'Failed to start payment. Please check your internet connection.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ backdropFilter: 'blur(8px)', zIndex: 9999 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="modal-card"
        style={{
          maxWidth: '540px',
          padding: '2.25rem',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(99, 102, 241, 0.25)'
        }}
      >
        {success ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#dcfce7',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 10px 25px rgba(22, 163, 74, 0.2)'
            }}>
              <CheckCircle2 size={48} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontFamily: 'Outfit', margin: '0 0 0.5rem', color: 'var(--text-main)' }}>
              Account Activated! 🎉
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '380px', margin: '0 auto' }}>
              Your ₦3,000 provider activation has been verified via Paystack. Your D.WORLD specialist dashboard is now fully unlocked!
            </p>
          </div>
        ) : (
          <div>
            {/* Header Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Lock size={24} />
              </div>
              <div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: '#d97706',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  marginBottom: '0.2rem'
                }}>
                  <AlertCircle size={12} /> ACCOUNT PENDING ACTIVATION
                </span>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontFamily: 'Outfit' }}>
                  Unlock Your Expert Workspace
                </h3>
              </div>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Welcome to the D.WORLD verified beauty and styling network, <strong style={{ color: 'var(--text-main)' }}>{user.name}</strong>. Complete your one-time <strong>₦3,000 account activation</strong> to publish services, get discovered by students, and accept appointments.
            </p>

            {/* Price Showcase Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08))',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '16px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  One-Time Activation Fee
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'Outfit' }}>
                    ₦3,000
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>NGN</span>
                </div>
              </div>
              <div style={{
                background: 'white',
                padding: '0.4rem 0.75rem',
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#059669'
              }}>
                <ShieldCheck size={16} /> Paystack Secured
              </div>
            </div>

            {/* Unlocked Benefits */}
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Features Unlocked Instantly:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {[
                  'Campus-wide listing in the verified booking directory',
                  'Live client appointment scheduling & calendar syncing',
                  'In-app direct messaging with student clients',
                  'Expert wallet with instant bank payouts & earnings tracking',
                  'Custom working hours & daily availability switcher'
                ].map((benefit, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    <CheckCircle2 size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div style={{
                background: '#fee2e2',
                color: '#b91c1c',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Pay Button */}
            <button
              type="button"
              onClick={handlePayActivation}
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1rem',
                fontWeight: 700,
                justifyContent: 'center',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)'
              }}
            >
              {loading ? (
                'Opening Paystack Checkout...'
              ) : (
                <>
                  <CreditCard size={18} />
                  <span>Pay ₦3,000 Activation with Paystack</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', margin: '1rem 0 0' }}>
              🔒 Powered by Paystack (Card, USSD, Bank Transfer). Instant automated activation.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ExpertActivationModal;
