import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Building2, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Banknote,
  Wallet,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  Check,
  AlertTriangle,
  History,
  Lock,
  ChevronRight
} from 'lucide-react';
import { API_URL } from '../config/api';
import { useNotify } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000];

const WithdrawPage = () => {
  const { notify } = useNotify();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Wallet & Payout States
  const [walletBalance, setWalletBalance] = useState(user?.walletBalance || 0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [payouts, setPayouts] = useState([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);

  // Bank Form States
  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBankCode, setSelectedBankCode] = useState(user?.bankDetails?.bankCode || '');
  const [selectedBankName, setSelectedBankName] = useState(user?.bankDetails?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(user?.bankDetails?.accountNumber || '');
  const [accountName, setAccountName] = useState(user?.bankDetails?.accountName || '');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(Boolean(user?.bankDetails?.accountName));
  const [verificationError, setVerificationError] = useState('');

  // Amount & Submit States
  const [amount, setAmount] = useState('5000');
  const [submitting, setSubmitting] = useState(false);
  const [successPayout, setSuccessPayout] = useState(null);

  // Toggle for editing bank if user already has saved details
  const hasSavedBank = Boolean(user?.bankDetails?.accountName && user?.bankDetails?.accountNumber);
  const [usingSavedBank, setUsingSavedBank] = useState(hasSavedBank);

  // Initial Data Fetch
  useEffect(() => {
    fetchWalletBalance();
    fetchBanks();
    fetchMyPayouts();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      setLoadingBalance(true);
      const res = await axios.get(`${API_URL}/auth/wallet`);
      if (res.data.success && res.data.data) {
        setWalletBalance(res.data.data.walletBalance || 0);
      }
    } catch (err) {
      console.warn('Wallet balance fetch notice:', err);
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchBanks = async () => {
    try {
      setLoadingBanks(true);
      const res = await axios.get(`${API_URL}/payouts/banks`);
      if (res.data.success && Array.isArray(res.data.data)) {
        setBanks(res.data.data);
      }
    } catch (err) {
      console.warn('Bank list load notice:', err);
    } finally {
      setLoadingBanks(false);
    }
  };

  const fetchMyPayouts = async () => {
    try {
      setLoadingPayouts(true);
      const res = await axios.get(`${API_URL}/payouts/my-payouts`);
      if (res.data.success && Array.isArray(res.data.data)) {
        setPayouts(res.data.data);
      }
    } catch (err) {
      console.warn('Payout history load notice:', err);
    } finally {
      setLoadingPayouts(false);
    }
  };

  // Filtered Banks for Search
  const filteredBanks = useMemo(() => {
    if (!bankSearch.trim()) return banks;
    const q = bankSearch.toLowerCase().trim();
    return banks.filter(b => b.name.toLowerCase().includes(q) || String(b.code).includes(q));
  }, [banks, bankSearch]);

  const handleBankChange = (e) => {
    const code = e.target.value;
    setSelectedBankCode(code);
    const found = banks.find(b => String(b.code) === String(code));
    setSelectedBankName(found ? found.name : '');
    setVerified(false);
    setAccountName('');
    setVerificationError('');
  };

  const handleAccountChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setAccountNumber(val);
    setVerified(false);
    setAccountName('');
    setVerificationError('');

    // Auto verify when 10 digits entered and bank is selected
    if (val.length === 10 && selectedBankCode) {
      triggerAccountVerification(val, selectedBankCode);
    }
  };

  const triggerAccountVerification = async (accNum, bankCode) => {
    const cleanAcc = accNum || accountNumber;
    const cleanCode = bankCode || selectedBankCode;

    if (!cleanCode || cleanAcc.length !== 10) {
      setVerificationError('Please select a bank and enter a valid 10-digit NUBAN account number.');
      return;
    }

    setVerifying(true);
    setVerificationError('');
    try {
      const res = await axios.post(`${API_URL}/payouts/resolve-account`, {
        account_number: cleanAcc,
        bank_code: cleanCode
      });

      if (res.data.success && res.data.data) {
        setAccountName(res.data.data.account_name);
        setVerified(true);
        notify.success(`Verified: ${res.data.data.account_name}`);
      } else {
        setVerificationError('Could not verify account holder name. Please check your account number.');
      }
    } catch (err) {
      setVerificationError(err.response?.data?.message || 'Verification failed. Please confirm account number and selected bank.');
    } finally {
      setVerifying(false);
    }
  };

  const handleQuickAmount = (val) => {
    setAmount(String(val));
  };

  const handleApplySavedBank = () => {
    if (user?.bankDetails?.accountName) {
      setSelectedBankCode(user.bankDetails.bankCode || '');
      setSelectedBankName(user.bankDetails.bankName || '');
      setAccountNumber(user.bankDetails.accountNumber || '');
      setAccountName(user.bankDetails.accountName || '');
      setVerified(true);
      setUsingSavedBank(true);
      setVerificationError('');
      notify.success(`Loaded saved bank details for ${user.bankDetails.bankName}`);
    }
  };

  const numAmount = parseFloat(amount) || 0;
  const isAmountValid = numAmount >= 1000 && numAmount <= walletBalance;
  const remainingBalance = Math.max(0, walletBalance - numAmount);
  const pendingPayoutTotal = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (numAmount < 1000) {
      notify.error('Minimum withdrawal amount is ₦1,000.');
      return;
    }

    if (numAmount > walletBalance) {
      notify.error(`Cannot withdraw more than your available balance (₦${walletBalance.toLocaleString()}).`);
      return;
    }

    if (!selectedBankName || !selectedBankCode || accountNumber.length !== 10) {
      notify.error('Please enter complete bank details.');
      return;
    }

    if (!verified || !accountName) {
      notify.error('Please verify your bank account holder name before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/payouts/request`, {
        amount: numAmount,
        bankName: selectedBankName,
        bankCode: selectedBankCode,
        accountNumber,
        accountName
      });

      if (res.data.success) {
        notify.success(res.data.message || 'Withdrawal request submitted successfully!');
        const updatedBal = res.data.walletBalance ?? (walletBalance - numAmount);
        setWalletBalance(updatedBal);
        setSuccessPayout({
          amount: numAmount,
          reference: res.data.data?.reference || `WD-${Date.now()}`,
          bankName: selectedBankName,
          accountNumber,
          accountName
        });

        // Update local auth user cache
        if (updateUser) {
          updateUser({
            ...user,
            walletBalance: updatedBal,
            bankDetails: {
              bankName: selectedBankName,
              bankCode: selectedBankCode,
              accountNumber,
              accountName
            }
          });
        }

        // Refresh recent payouts list
        fetchMyPayouts();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to submit withdrawal request.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.25)'
          }}>
            <CheckCircle2 size={12} /> Paid
          </span>
        );
      case 'rejected':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.25)'
          }}>
            <AlertCircle size={12} /> Refunded
          </span>
        );
      case 'approved':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: 'rgba(99, 102, 241, 0.12)',
            color: '#6366f1',
            border: '1px solid rgba(99, 102, 241, 0.25)'
          }}>
            <Clock size={12} /> Approved
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: 'rgba(245, 158, 11, 0.12)',
            color: '#f59e0b',
            border: '1px solid rgba(245, 158, 11, 0.25)'
          }}>
            <Clock size={12} /> Processing
          </span>
        );
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.25rem 1rem 3rem' }}>
      
      {/* ── Breadcrumb & Top Navigation ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={() => {
            if (location.state?.from) {
              navigate(location.state.from);
            } else if (user?.role === 'expert' || user?.role === 'stylist') {
              navigate('/expert?tab=wallet');
            } else {
              navigate('/wallet');
            }
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-light, #e2e8f0)',
            borderRadius: '12px',
            padding: '0.5rem 0.95rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--text-main, #0f172a)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <ArrowLeft size={16} /> Back to Wallet
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.85rem',
            borderRadius: '999px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#059669',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            <ShieldCheck size={14} /> Official Paystack NUBAN Rail
          </span>
          <button
            type="button"
            onClick={() => {
              fetchWalletBalance();
              fetchMyPayouts();
              notify.success('Balances updated.');
            }}
            title="Refresh balances"
            style={{
              background: 'var(--bg-card, #ffffff)',
              border: '1px solid var(--border-light, #e2e8f0)',
              borderRadius: '10px',
              padding: '0.45rem',
              color: 'var(--text-muted, #64748b)',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} className={loadingBalance ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Page Header Banner ── */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.9rem', margin: 0, fontFamily: 'Outfit', fontWeight: 800, color: 'var(--text-main)' }}>
          Withdraw Funds to Bank
        </h1>
        <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.925rem', maxWidth: '650px' }}>
          Disburse your earnings and campus balance directly to any licensed Nigerian commercial bank or fintech account with zero transfer charges.
        </p>
      </div>

      {/* ── Balance Hero Bento Card ── */}
      <div style={{
        background: 'linear-gradient(135deg, #3730a3 0%, #4f46e5 55%, #6366f1 100%)',
        borderRadius: '24px',
        padding: '2rem',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 45px -10px rgba(79, 70, 229, 0.4)',
        marginBottom: '2rem'
      }}>
        {/* Glow orb */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.8)' }}>
              Available Wallet Balance
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.3rem' }}>
              <span style={{ fontSize: '1.6rem', fontWeight: 800 }}>₦</span>
              <h2 style={{ margin: 0, fontSize: '2.6rem', fontFamily: 'Outfit', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                {Number(walletBalance || 0).toLocaleString()}
              </h2>
            </div>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.825rem', color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={14} color="#fde047" /> Ready for immediate bank transfer
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.65rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 1rem',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.18)',
              fontSize: '0.825rem'
            }}>
              <span style={{ color: 'rgba(255,255,255,0.85)' }}>Transfer Fee:</span>
              <strong style={{ color: '#4ade80' }}>₦0.00 (100% FREE)</strong>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 1rem',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.18)',
              fontSize: '0.825rem'
            }}>
              <span style={{ color: 'rgba(255,255,255,0.85)' }}>Minimum Payout:</span>
              <strong>₦1,000</strong>
            </div>

            {pendingPayoutTotal > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 1rem',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                fontSize: '0.825rem'
              }}>
                <span style={{ color: '#fef08a' }}>In Processing:</span>
                <strong style={{ color: '#fef08a' }}>₦{pendingPayoutTotal.toLocaleString()}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Success Celebration Modal / Alert ── */}
      <AnimatePresence>
        {successPayout && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1.5px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '20px',
              padding: '1.5rem',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 46,
                height: 46,
                borderRadius: '14px',
                background: '#10b981',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <CheckCircle2 size={26} />
              </div>
              <div>
                <h4 style={{ margin: 0, color: '#065f46', fontSize: '1.05rem', fontWeight: 800 }}>
                  Withdrawal of ₦{successPayout.amount.toLocaleString()} Submitted!
                </h4>
                <p style={{ margin: '0.2rem 0 0', color: '#047857', fontSize: '0.85rem' }}>
                  Destination: <strong>{successPayout.bankName}</strong> ({successPayout.accountNumber}) · Ref: <code>{successPayout.reference}</code>
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setSuccessPayout(null)}
                style={{
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.55rem 1.15rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Two-Column Workflow ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Form Card */}
        <div style={{
          background: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-light, #e2e8f0)',
          borderRadius: '24px',
          padding: '2rem',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light, #e2e8f0)', paddingBottom: '1rem' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'rgba(79, 70, 229, 0.1)',
              color: 'var(--primary, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Banknote size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'Outfit', color: 'var(--text-main)' }}>
                Transfer Request Details
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Step-by-step account verification & instant dispatch
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* ── Step 1: Amount Input & Quick Chips ── */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  1. Enter Withdrawal Amount (₦)
                </label>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Available: <strong style={{ color: '#10b981' }}>₦{walletBalance.toLocaleString()}</strong>
                </span>
              </div>

              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '1.15rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontWeight: 900,
                  fontSize: '1.35rem',
                  color: 'var(--primary, #4f46e5)',
                  pointerEvents: 'none'
                }}>
                  ₦
                </span>
                <input
                  type="number"
                  min="1000"
                  max={walletBalance}
                  step="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5,000"
                  required
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem 0.85rem 2.6rem',
                    borderRadius: '14px',
                    border: isAmountValid ? '2px solid rgba(79, 70, 229, 0.35)' : '2px solid rgba(239, 68, 68, 0.4)',
                    background: 'var(--bg-main, #f8fafc)',
                    color: 'var(--text-main, #0f172a)',
                    fontSize: '1.3rem',
                    fontWeight: 800,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s ease'
                  }}
                />
              </div>

              {/* Quick Preset Chips */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                {PRESET_AMOUNTS.filter(v => v <= walletBalance).map((val) => {
                  const isSelected = String(amount) === String(val);
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleQuickAmount(val)}
                      style={{
                        padding: '0.45rem 0.95rem',
                        borderRadius: '10px',
                        border: isSelected ? '1.5px solid #4f46e5' : '1px solid var(--border-light, #e2e8f0)',
                        background: isSelected ? '#4f46e5' : 'var(--bg-main, #f8fafc)',
                        color: isSelected ? '#ffffff' : 'var(--text-main, #0f172a)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      ₦{val.toLocaleString()}
                    </button>
                  );
                })}
                {walletBalance >= 1000 && (
                  <button
                    type="button"
                    onClick={() => handleQuickAmount(walletBalance)}
                    style={{
                      padding: '0.45rem 0.95rem',
                      borderRadius: '10px',
                      border: String(amount) === String(walletBalance) ? '1.5px solid #10b981' : '1px solid rgba(16, 185, 129, 0.3)',
                      background: String(amount) === String(walletBalance) ? '#10b981' : 'rgba(16, 185, 129, 0.08)',
                      color: String(amount) === String(walletBalance) ? '#ffffff' : '#047857',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Max (₦{walletBalance.toLocaleString()})
                  </button>
                )}
              </div>

              {/* Real-time Balance Calculation Notice */}
              <div style={{ marginTop: '0.65rem', fontSize: '0.8rem' }}>
                {numAmount > walletBalance ? (
                  <span style={{ color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <AlertCircle size={14} /> Amount exceeds your available balance of ₦{walletBalance.toLocaleString()}
                  </span>
                ) : numAmount < 1000 && numAmount > 0 ? (
                  <span style={{ color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <AlertTriangle size={14} /> Minimum withdrawal threshold is ₦1,000
                  </span>
                ) : numAmount >= 1000 ? (
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    Remaining wallet balance after transfer: <strong style={{ color: 'var(--text-main)' }}>₦{remainingBalance.toLocaleString()}</strong>
                  </span>
                ) : null}
              </div>
            </div>

            {/* ── Step 2: Saved Bank Card or Bank Setup ── */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  2. Destination Bank Details
                </label>
                {hasSavedBank && (
                  <button
                    type="button"
                    onClick={() => {
                      if (usingSavedBank) {
                        setUsingSavedBank(false);
                      } else {
                        handleApplySavedBank();
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary, #4f46e5)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    {usingSavedBank ? '+ Use Different Bank' : '← Use Saved Bank'}
                  </button>
                )}
              </div>

              {/* Saved Bank Box */}
              {usingSavedBank && hasSavedBank ? (
                <div style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.06), rgba(124, 58, 237, 0.04))',
                  border: '1.5px solid rgba(79, 70, 229, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '12px',
                      background: '#4f46e5',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Building2 size={22} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{user.bankDetails.bankName}</strong>
                        <span style={{
                          fontSize: '0.68rem',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#059669',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '99px',
                          fontWeight: 700
                        }}>
                          SAVED & VERIFIED
                        </span>
                      </div>
                      <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        NUBAN: <strong>{user.bankDetails.accountNumber}</strong> · {user.bankDetails.accountName}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setUsingSavedBank(false)}
                    style={{
                      background: 'var(--bg-main, #f8fafc)',
                      border: '1px solid var(--border-light, #e2e8f0)',
                      borderRadius: '10px',
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      cursor: 'pointer'
                    }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                /* Bank Selector & Form */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Bank Select */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      Select Commercial Bank or Fintech
                    </label>
                    
                    {/* Bank Search Input */}
                    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                      <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Search bank name (e.g. GTBank, Kuda, OPay)..."
                        value={bankSearch}
                        onChange={(e) => setBankSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.85rem 0.55rem 2.2rem',
                          borderRadius: '10px',
                          border: '1px solid var(--border-light, #e2e8f0)',
                          background: 'var(--bg-main, #f8fafc)',
                          color: 'var(--text-main)',
                          fontSize: '0.825rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <select
                      value={selectedBankCode}
                      onChange={handleBankChange}
                      disabled={loadingBanks}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        border: '1px solid var(--border-light, #e2e8f0)',
                        background: 'var(--bg-main, #f8fafc)',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">-- Choose your Nigerian Bank --</option>
                      {filteredBanks.map((bank) => (
                        <option key={bank.code || bank.id} value={bank.code}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 10-Digit Account Number */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        10-Digit NUBAN Account Number
                      </label>
                      <span style={{ fontSize: '0.75rem', color: accountNumber.length === 10 ? '#10b981' : 'var(--text-muted)' }}>
                        {accountNumber.length}/10 digits
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <CreditCard size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={10}
                          value={accountNumber}
                          onChange={handleAccountChange}
                          placeholder="e.g. 0123456789"
                          required
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem 0.75rem 2.5rem',
                            borderRadius: '12px',
                            border: verified ? '1.5px solid #10b981' : '1px solid var(--border-light, #e2e8f0)',
                            background: 'var(--bg-main, #f8fafc)',
                            color: 'var(--text-main)',
                            fontSize: '1rem',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => triggerAccountVerification(accountNumber, selectedBankCode)}
                        disabled={verifying || !selectedBankCode || accountNumber.length !== 10}
                        style={{
                          padding: '0.75rem 1.25rem',
                          borderRadius: '12px',
                          border: 'none',
                          background: verified ? '#10b981' : 'var(--primary, #4f46e5)',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: (verifying || !selectedBankCode || accountNumber.length !== 10) ? 'not-allowed' : 'pointer',
                          opacity: (verifying || !selectedBankCode || accountNumber.length !== 10) ? 0.6 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          flexShrink: 0
                        }}
                      >
                        {verifying ? (
                          <>
                            <Loader2 size={16} className="animate-spin" /> Verifying...
                          </>
                        ) : verified ? (
                          <>
                            <Check size={16} /> Verified
                          </>
                        ) : (
                          'Verify'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Verification Status Alerts */}
                  {verificationError && (
                    <div style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '12px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#dc2626',
                      fontSize: '0.825rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <AlertCircle size={16} flexShrink={0} />
                      <span>{verificationError}</span>
                    </div>
                  )}

                  {verified && accountName && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        padding: '1rem',
                        borderRadius: '14px',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1.5px solid rgba(16, 185, 129, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        background: '#10b981',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <CheckCircle2 size={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Verified Account Holder
                        </span>
                        <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#065f46', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {accountName}
                        </p>
                        <span style={{ fontSize: '0.75rem', color: '#059669' }}>
                          {selectedBankName} · {accountNumber}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* ── Step 3: Breakdown & Action ── */}
            <div style={{
              background: 'var(--bg-main, #f8fafc)',
              borderRadius: '16px',
              padding: '1.25rem',
              border: '1px solid var(--border-light, #e2e8f0)',
              fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                <span>Transfer Amount:</span>
                <strong style={{ color: 'var(--text-main)' }}>₦{numAmount.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                <span>D.WORLD Transfer Fee:</span>
                <strong style={{ color: '#10b981' }}>₦0.00 (100% Free)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                <span>Beneficiary:</span>
                <strong style={{ color: 'var(--text-main)' }}>{accountName || 'Pending verification'}</strong>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '0.65rem',
                marginTop: '0.65rem',
                borderTop: '1px solid var(--border-light, #e2e8f0)',
                fontSize: '1rem',
                fontWeight: 800
              }}>
                <span>Total Net Payout:</span>
                <span style={{ color: 'var(--primary, #4f46e5)' }}>₦{numAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !verified || !accountName || !isAmountValid}
              style={{
                width: '100%',
                padding: '1rem 1.5rem',
                borderRadius: '16px',
                border: 'none',
                background: (submitting || !verified || !accountName || !isAmountValid)
                  ? 'rgba(79, 70, 229, 0.4)'
                  : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                color: '#ffffff',
                fontSize: '1rem',
                fontWeight: 800,
                cursor: (submitting || !verified || !accountName || !isAmountValid) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.65rem',
                boxShadow: (submitting || !verified || !accountName || !isAmountValid) ? 'none' : '0 12px 25px -5px rgba(79, 70, 229, 0.45)',
                transition: 'all 0.2s ease'
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> Processing Withdrawal Request...
                </>
              ) : (
                <>
                  <span>Request ₦{numAmount.toLocaleString()} Payout</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {!verified && (
              <p style={{ margin: 0, textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                🔒 Complete bank account verification above to unlock payout submission.
              </p>
            )}
          </form>
        </div>

        {/* Right Column: Security Guarantees & Payout History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          {/* Security & Guarantee Card */}
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-light, #e2e8f0)',
            borderRadius: '24px',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontFamily: 'Outfit', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
              <ShieldCheck size={18} color="#10b981" /> D.WORLD Payout Guarantee
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span><strong>Instant Automated Reversals:</strong> If an admin rejects or declines a payout request, 100% of the funds are immediately restored to your campus wallet.</span>
              </div>
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span><strong>Zero Hidden Charges:</strong> 100% of requested funds are deposited directly to your bank account without deductions.</span>
              </div>
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span><strong>Bank Network Compatibility:</strong> Works natively with all commercial banks (GTB, Zenith, Access, First Bank) and digital fintechs (Kuda, OPay, Palmpay, Moniepoint).</span>
              </div>
            </div>
          </div>

          {/* Real-time Withdrawal History Ledger */}
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-light, #e2e8f0)',
            borderRadius: '24px',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontFamily: 'Outfit', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                <History size={18} color="var(--primary)" /> Payout Activity & History
              </h4>
              <button
                type="button"
                onClick={fetchMyPayouts}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                title="Refresh history"
              >
                <RefreshCw size={13} className={loadingPayouts ? 'animate-spin' : ''} />
              </button>
            </div>

            {loadingPayouts ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : payouts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
                {payouts.map((p) => (
                  <div
                    key={p._id}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '14px',
                      border: '1px solid var(--border-light, #e2e8f0)',
                      background: 'var(--bg-main, #f8fafc)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                          ₦{(p.amount || 0).toLocaleString()}
                        </strong>
                        {getStatusBadge(p.status)}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.bankDetails?.bankName} · {p.bankDetails?.accountNumber}
                      </p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </span>
                      {p.adminNotes && (
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: '#ef4444', fontStyle: 'italic' }}>
                          Note: {p.adminNotes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                  <CreditCard size={20} />
                </div>
                <strong style={{ fontSize: '0.88rem', display: 'block', color: 'var(--text-main)' }}>No Prior Withdrawals</strong>
                <span style={{ fontSize: '0.78rem' }}>Your requested payout transactions and bank settlement tracking will appear here.</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default WithdrawPage;
