import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { API_URL } from '../config/api';

const PRESET_AMOUNTS = [1000, 2000, 3000, 5000, 10000];

const WalletPage = () => {
  const { user, refreshUser } = useAuth();
  const { notify } = useNotify();
  const [searchParams, setSearchParams] = useSearchParams();

  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState('2000');
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [successBanner, setSuccessBanner] = useState('');
  const [errorBanner, setErrorBanner] = useState('');

  useEffect(() => {
    fetchWalletData();

    // Check if returning from Paystack redirect
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    const statusParam = searchParams.get('status');

    if (reference) {
      verifyPaystackPayment(reference);
    } else if (statusParam === 'success') {
      setSuccessBanner('Payment successful! Your wallet balance has been updated.');
      fetchWalletData();
    }
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/auth/wallet`);
      if (res.data.success) {
        setWalletBalance(res.data.data.walletBalance || 0);
        setTransactions(res.data.data.transactions || []);
      }
    } catch (err) {
      console.error('Wallet fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const verifyPaystackPayment = async (ref) => {
    try {
      setSubmitting(true);
      const res = await axios.post(`${API_URL}/payments/verify`, { reference: ref });
      if (res.data.success) {
        setSuccessBanner(`Payment verified! ₦${(res.data.amount || 0).toLocaleString()} credited to your wallet.`);
        setWalletBalance(res.data.walletBalance);
        notify.success('Wallet topped up successfully! 🎉');
        if (refreshUser) refreshUser();
        fetchWalletData();
        // Clean URL parameters
        setSearchParams({});
      } else {
        setErrorBanner(res.data.message || 'Payment verification failed');
      }
    } catch (err) {
      setErrorBanner(err.response?.data?.message || 'Failed to verify transaction. Please contact support.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTopup = async (e) => {
    if (e) e.preventDefault();
    setErrorBanner('');
    setSuccessBanner('');

    const numericAmount = Number(topupAmount);
    if (!numericAmount || numericAmount < 100) {
      setErrorBanner('Please enter a valid amount (minimum ₦100).');
      return;
    }

    setSubmitting(true);
    try {
      const userEmail = user?.email || '';
      const userName = user?.name || 'Lead City Student';

      // Server-side initialization redirects directly to Paystack official gateway
      // Works 100% smoothly across iOS Safari, Android, and Desktop with zero popup blocks
      const initRes = await axios.post(`${API_URL}/payments/initialize`, {
        amount: numericAmount,
        purpose: 'wallet_topup',
        email: userEmail,
        name: userName
      });

      if (initRes.data.success && initRes.data.data?.authorization_url) {
        window.location.href = initRes.data.data.authorization_url;
      } else {
        throw new Error(initRes.data.message || 'Could not initialize Paystack payment');
      }
    } catch (err) {
      console.error('Wallet payment initialize error:', err);
      setErrorBanner(err.response?.data?.message || err.message || 'Payment could not be started. Please try again.');
      setSubmitting(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'all') return true;
    if (filterType === 'deposit') return t.type === 'deposit';
    if (filterType === 'payment') return t.type === 'payment';
    if (filterType === 'refund') return t.type === 'refund';
    return true;
  });

  return (
    <div className="page-wrapper container animate-fade-in" style={{ padding: '1.5rem 1rem 4rem', maxWidth: '1040px', margin: '0 auto' }}>
      
      {/* ── Top Header ── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            D.WORLD CASHLESS CAMPUS
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>•</span>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>100% Student Protection</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', margin: 0, fontFamily: 'Outfit', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Student Wallet & Balance
            </h1>
            <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Instant deposits, 1-click appointment booking, and automated refund guarantee.
            </p>
          </div>
          <button 
            onClick={fetchWalletData} 
            className="btn btn-secondary" 
            style={{ padding: '0.55rem 1rem', borderRadius: '10px', fontSize: '0.85rem' }}
            title="Refresh balance"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Alerts & Status Banners ── */}
      {successBanner && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#34d399',
          borderRadius: '14px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={20} flexShrink={0} />
          <span>{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          borderRadius: '14px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <AlertCircle size={20} flexShrink={0} />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* ── Main Two-Column Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Left Card: Sleek Digital Campus Card */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 50%, #1e1b4b 100%)',
          borderRadius: '24px',
          padding: '2rem',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 40px -15px rgba(79, 70, 229, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '260px'
        }}>
          {/* Subtle background glow effect */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <img src="/logo-sm.png" alt="D.WORLD" width="32" height="32" style={{ borderRadius: 8, boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }} />
                <div>
                  <strong style={{ fontSize: '1.1rem', letterSpacing: '0.05em', fontFamily: 'Outfit' }}>D.WORLD</strong>
                  <span style={{ display: 'block', fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Campus Pay</span>
                </div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                padding: '0.3rem 0.65rem',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.05em'
              }}>
                ● ACTIVE
              </div>
            </div>

            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.7)' }}>
              AVAILABLE STUDENT BALANCE
            </span>
            <div style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)', fontWeight: 900, fontFamily: 'Outfit', lineHeight: 1.1, margin: '0.4rem 0 1.25rem' }}>
              ₦{walletBalance.toLocaleString()}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '1rem' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>STUDENT ACCOUNT</span>
              <strong style={{ fontSize: '0.95rem', letterSpacing: '0.02em' }}>{user?.name || 'Verified Student'}</strong>
            </div>
            {user?.matricNo && (
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>MATRIC NO</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.04em' }}>{user.matricNo}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Instant Paystack Top-Up Form (No Modal!) */}
        <div className="app-card" style={{ padding: '1.75rem', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <CreditCard size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', margin: 0, fontFamily: 'Outfit', color: 'var(--text-main)' }}>
                Top Up via Paystack
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Bank Card, USSD, Transfer & Apple Pay
              </span>
            </div>
          </div>

          <form onSubmit={handleTopup}>
            {/* Preset Amount Chips */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                SELECT QUICK AMOUNT
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.45rem' }}>
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopupAmount(amt.toString())}
                    style={{
                      padding: '0.65rem 0.25rem',
                      borderRadius: '10px',
                      border: topupAmount === amt.toString() ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                      background: topupAmount === amt.toString() ? 'rgba(99, 102, 241, 0.12)' : 'var(--surface)',
                      color: topupAmount === amt.toString() ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    ₦{(amt / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                OR ENTER CUSTOM AMOUNT (₦)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: 'var(--text-muted)'
                }}>
                  ₦
                </span>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="e.g. 3,500"
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem 0.85rem 2.4rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.95rem',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)'
              }}
            >
              {submitting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Redirecting to Paystack...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Proceed to Paystack ₦{Number(topupAmount || 0).toLocaleString()}</span>
                </>
              )}
            </button>
          </form>

          {/* Guarantee banner */}
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.75rem',
            color: '#34d399'
          }}>
            <ShieldCheck size={14} flexShrink={0} />
            <span>Funds are credited instantly upon payment verification.</span>
          </div>
        </div>
      </div>

      {/* ── Transaction History Section ── */}
      <div className="app-card" style={{ padding: '1.75rem', borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', margin: 0, fontFamily: 'Outfit', color: 'var(--text-main)' }}>
              Wallet Activity & History
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Real-time ledger of deposits, specialist payments, and refunds
            </span>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-main)', padding: '0.25rem', borderRadius: '10px' }}>
            {['all', 'deposit', 'payment', 'refund'].map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilterType(f)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '7px',
                  border: 'none',
                  background: filterType === f ? 'var(--primary)' : 'transparent',
                  color: filterType === f ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'capitalize',
                  cursor: 'pointer'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions List */}
        {filteredTransactions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {filteredTransactions.map((tx, idx) => {
              const isPositive = tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'earning';
              return (
                <div
                  key={tx._id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    borderRadius: '14px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '12px',
                      background: isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isPositive ? '#10b981' : '#ef4444',
                      flexShrink: 0
                    }}>
                      {isPositive ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.925rem', color: 'var(--text-main)', display: 'block' }}>
                        {tx.description || (isPositive ? 'Wallet Top-Up' : 'Appointment Payment')}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {tx.date ? new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                        {tx.reference_id && ` • Ref: ${tx.reference_id}`}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      fontFamily: 'Outfit',
                      color: isPositive ? '#10b981' : '#ef4444'
                    }}>
                      {isPositive ? '+' : '-'}₦{Number(tx.amount || 0).toLocaleString()}
                    </span>
                    <span style={{
                      display: 'block',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: isPositive ? '#34d399' : '#f87171'
                    }}>
                      {tx.type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Receipt size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <h4 style={{ margin: '0 0 0.35rem', color: 'var(--text-main)' }}>No Transactions Found</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Top up your wallet above to make appointments and campus purchases.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default WalletPage;
