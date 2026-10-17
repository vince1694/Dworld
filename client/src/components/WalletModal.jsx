import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, X, PlusCircle, ArrowUpRight, ArrowDownLeft, ShieldCheck, RefreshCw } from 'lucide-react';
import axios from 'axios';

import { API_URL } from '../config/api';

const PAYSTACK_FALLBACK_KEY = 'pk_live_060e4958254697673bb978c4a4df3694fae9099b';

/** Dynamically ensure Paystack inline script is loaded */
const loadPaystackScript = () => new Promise((resolve, reject) => {
  if (typeof window.PaystackPop !== 'undefined') return resolve();
  const existing = document.querySelector('script[src*="paystack"]');
  if (existing) {
    existing.addEventListener('load', resolve);
    existing.addEventListener('error', reject);
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://js.paystack.co/v1/inline.js';
  script.async = true;
  script.onload = resolve;
  script.onerror = () => reject(new Error('Paystack script failed to load'));
  document.head.appendChild(script);
});

const WalletModal = ({ isOpen, onClose, onWalletUpdated }) => {
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState('100');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchWallet();
    }
  }, [isOpen]);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/auth/wallet`);
      if (res.data.success) {
        setWalletBalance(res.data.data.walletBalance);
        setTransactions(res.data.data.transactions || []);
      }
    } catch (err) {
      console.error('Error fetching wallet balance', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    if (!topupAmount || Number(topupAmount) <= 0) {
      setMessage({ text: 'Please enter a valid amount in Naira', type: 'error' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage('');

      // 1. Ensure Paystack inline script is ready
      try {
        await loadPaystackScript();
      } catch (err) {
        console.warn('Paystack script dynamic load warning:', err);
      }

      // 2. Fetch public key
      let publicKey = PAYSTACK_FALLBACK_KEY;
      try {
        const configRes = await axios.get(`${API_URL}/payments/config`);
        if (configRes.data.success && configRes.data.publicKey) {
          publicKey = configRes.data.publicKey;
        }
      } catch (e) {
        console.warn('Using fallback Paystack key', e);
      }

      const userRes = await axios.get(`${API_URL}/auth/me`);
      const userEmail = userRes.data?.user?.email || 'client@dworld.com';
      const userName = userRes.data?.user?.name || 'Client';

      // 3. Try popup first
      if (typeof window.PaystackPop !== 'undefined') {
        const handler = window.PaystackPop.setup({
          key: publicKey,
          email: userEmail,
          amount: Math.round(Number(topupAmount) * 100),
          currency: 'NGN',
          ref: 'WAL-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          metadata: {
            purpose: 'wallet_topup',
            user_name: userName,
            user_id: userRes.data?.user?._id || userRes.data?.user?.id
          },
          callback: async (response) => {
            try {
              const verifyRes = await axios.post(`${API_URL}/payments/verify`, {
                reference: response.reference
              });
              if (verifyRes.data.success) {
                setMessage({ text: `₦${Number(topupAmount).toLocaleString()} deposited into your wallet via Paystack!`, type: 'success' });
                setWalletBalance(verifyRes.data.walletBalance);
                fetchWallet();
                if (onWalletUpdated) onWalletUpdated(verifyRes.data.walletBalance);
              } else {
                setMessage({ text: verifyRes.data.message || 'Payment verification failed', type: 'error' });
              }
            } catch (err) {
              setMessage({ text: err.response?.data?.message || 'Payment verification failed', type: 'error' });
            } finally {
              setSubmitting(false);
            }
          },
          onClose: () => {
            setSubmitting(false);
          }
        });

        handler.openIframe();
        return;
      }

      // 4. Hard fallback: server-side transaction initialize redirect
      const initRes = await axios.post(`${API_URL}/payments/initialize`, {
        amount: Number(topupAmount),
        purpose: 'wallet_topup'
      });
      if (initRes.data.success && initRes.data.data?.authorization_url) {
        window.location.href = initRes.data.data.authorization_url;
      } else {
        setMessage({ text: 'Could not start payment. Please check your network and try again.', type: 'error' });
        setSubmitting(false);
      }
    } catch (err) {
      console.error('Wallet topup error:', err);
      setMessage({ text: err.response?.data?.message || 'Could not start payment. Please try again.', type: 'error' });
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="modal-card"
        style={{ padding: '2rem', maxWidth: '580px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(79, 70, 229, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <Wallet size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'Outfit' }}>My D.WORLD Wallet</h3>
              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>Managed wallet balance & payments</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Balance Card */}
        <div style={{
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          borderRadius: '18px',
          padding: '1.75rem',
          color: 'white',
          boxShadow: '0 8px 25px rgba(79, 70, 229, 0.3)',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.825rem', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>AVAILABLE BALANCE</span>
            <h2 style={{ fontSize: '2.4rem', margin: '0.2rem 0 0', fontWeight: 900, color: 'white', fontFamily: 'Outfit' }}>
              ₦{walletBalance.toLocaleString()}
            </h2>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '0.5rem 0.8rem', borderRadius: '10px', backdropFilter: 'blur(4px)', fontSize: '0.8rem', fontWeight: 700 }}>
            TEST WALLET
          </div>
        </div>

        {/* Top-up Form */}
        <div style={{ background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontFamily: 'Outfit', color: 'var(--text-main)' }}>
            Instant Wallet Deposit (Test Funds)
          </h4>

          {message && (
            <div style={{
              background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: message.type === 'success' ? '#15803d' : '#b91c1c',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '0.85rem',
              fontWeight: 500
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleTopup} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flex: 1 }}>
              {['5000', '10000', '25000', '50000'].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTopupAmount(amt)}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.25rem',
                    borderRadius: '8px',
                    border: topupAmount === amt ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                    background: topupAmount === amt ? '#eef2ff' : 'white',
                    color: topupAmount === amt ? 'var(--primary)' : 'var(--text-main)',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  +₦{parseInt(amt).toLocaleString()}
                </button>
              ))}
            </div>
            <button 
              type="submit" 
              disabled={submitting}
              className="btn btn-primary" 
              style={{ padding: '0.55rem 1.15rem', fontSize: '0.85rem' }}
            >
              {submitting ? 'Depositing...' : 'Deposit'}
            </button>
          </form>
        </div>

        {/* Transaction History */}
        <div>
          <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontFamily: 'Outfit', color: 'var(--text-main)' }}>
            Recent Wallet Transactions
          </h4>

          {loading ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Loading transactions...
            </div>
          ) : transactions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '200px', overflowY: 'auto' }}>
              {transactions.map((tx, idx) => {
                const isDeposit = tx.type === 'deposit';
                const isEarning = tx.type === 'earning';
                const isPositive = isDeposit || isEarning;

                return (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid var(--border-light)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: isPositive ? '#dcfce7' : '#fee2e2',
                        color: isPositive ? '#15803d' : '#b91c1c',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {isPositive ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', color: 'var(--text-main)' }}>
                          {tx.description}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(tx.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <strong style={{ fontSize: '0.95rem', color: isPositive ? '#059669' : '#dc2626' }}>
                      {isPositive ? '+' : '-'}₦{tx.amount.toLocaleString()}
                    </strong>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No transactions yet.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default WalletModal;
