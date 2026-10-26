import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  X, 
  Building2, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  Banknote
} from 'lucide-react';
import { API_URL } from '../config/api';
import { useNotify } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const WithdrawModal = ({ isOpen, onClose, walletBalance = 0, onSuccess }) => {
  const navigate = useNavigate();
  const { notify } = useNotify();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      if (onClose) onClose();
      navigate('/withdraw');
    }
  }, [isOpen, navigate, onClose]);

  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [selectedBankCode, setSelectedBankCode] = useState(user?.bankDetails?.bankCode || '');
  const [selectedBankName, setSelectedBankName] = useState(user?.bankDetails?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(user?.bankDetails?.accountNumber || '');
  const [accountName, setAccountName] = useState(user?.bankDetails?.accountName || '');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(Boolean(user?.bankDetails?.accountName));
  const [verificationError, setVerificationError] = useState('');

  const [amount, setAmount] = useState('5000');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchBanks();
      if (user?.bankDetails?.accountName) {
        setSelectedBankCode(user.bankDetails.bankCode || '');
        setSelectedBankName(user.bankDetails.bankName || '');
        setAccountNumber(user.bankDetails.accountNumber || '');
        setAccountName(user.bankDetails.accountName || '');
        setVerified(true);
      }
    }
  }, [isOpen, user]);

  const fetchBanks = async () => {
    try {
      setLoadingBanks(true);
      const res = await axios.get(`${API_URL}/payouts/banks`);
      if (res.data.success) {
        setBanks(res.data.data || []);
      }
    } catch (err) {
      console.warn('Bank list load notice:', err);
    } finally {
      setLoadingBanks(false);
    }
  };

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
  };

  const verifyAccount = async () => {
    if (!selectedBankCode || accountNumber.length !== 10) {
      setVerificationError('Please select a bank and enter a complete 10-digit account number.');
      return;
    }

    setVerifying(true);
    setVerificationError('');
    try {
      const res = await axios.post(`${API_URL}/payouts/resolve-account`, {
        account_number: accountNumber,
        bank_code: selectedBankCode
      });

      if (res.data.success && res.data.data) {
        setAccountName(res.data.data.account_name);
        setVerified(true);
        notify.success(`Verified: ${res.data.data.account_name}`);
      } else {
        setVerificationError('Could not verify account holder name.');
      }
    } catch (err) {
      setVerificationError(err.response?.data?.message || 'Could not verify account. Please check the account number and bank.');
    } finally {
      setVerifying(false);
    }
  };

  const handleQuickAmount = (val) => {
    setAmount(String(val));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount < 1000) {
      notify.error('Minimum withdrawal is ₦1,000.');
      return;
    }

    if (numAmount > walletBalance) {
      notify.error(`Cannot withdraw more than your available balance (₦${walletBalance.toLocaleString()}).`);
      return;
    }

    if (!selectedBankName || !selectedBankCode || accountNumber.length !== 10) {
      notify.error('Please enter valid bank details.');
      return;
    }

    if (!verified || !accountName) {
      notify.error('Please verify your bank account holder name first.');
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
        notify.success(res.data.message || 'Withdrawal submitted successfully!');
        if (onSuccess) onSuccess(res.data.walletBalance);
        onClose();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to submit withdrawal request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="modal-overlay" 
        onClick={onClose}
        style={{ zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="app-card"
          onClick={(e) => e.stopPropagation()}
          style={{ width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '20px', padding: 0 }}
        >
          {/* Header */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Banknote size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'Outfit' }}>Withdraw to Bank</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Available: <strong style={{ color: '#10b981' }}>₦{walletBalance.toLocaleString()}</strong>
                </span>
              </div>
            </div>
            <button 
              type="button" 
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem' }}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Amount input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Withdrawal Amount (₦)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--primary)' }}>₦</span>
                <input
                  type="number"
                  min="1000"
                  max={walletBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Minimum 1,000"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.2rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                  required
                />
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {[2000, 5000, 10000, walletBalance].filter(v => v >= 1000).map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleQuickAmount(v)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      background: String(amount) === String(v) ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                      color: String(amount) === String(v) ? '#fff' : 'var(--text-muted)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {v === walletBalance ? 'Max (₦' + v.toLocaleString() + ')' : '₦' + v.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Bank Select */}
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Select Nigerian Bank
              </label>
              <select
                value={selectedBankCode}
                onChange={handleBankChange}
                disabled={loadingBanks}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
                required
              >
                <option value="">-- Choose your bank --</option>
                {banks.map(b => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Number */}
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                10-Digit NUBAN Account Number
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  maxLength={10}
                  value={accountNumber}
                  onChange={handleAccountChange}
                  placeholder="e.g. 0123456789"
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '0.95rem',
                    letterSpacing: '0.05em',
                    outline: 'none'
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={verifyAccount}
                  disabled={verifying || !selectedBankCode || accountNumber.length !== 10}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    opacity: (!selectedBankCode || accountNumber.length !== 10 || verifying) ? 0.6 : 1
                  }}
                >
                  {verifying ? <Loader2 size={16} className="animate-spin" /> : 'Verify'}
                </button>
              </div>

              {/* Verified Result Banner */}
              {verified && accountName && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginTop: '0.65rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <CheckCircle2 size={16} color="#10b981" />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>Verified Account Holder</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>{accountName}</div>
                  </div>
                </motion.div>
              )}

              {/* Error Notice */}
              {verificationError && (
                <div style={{ marginTop: '0.5rem', color: '#ef4444', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertCircle size={14} />
                  <span>{verificationError}</span>
                </div>
              )}
            </div>

            {/* Escrow Guarantee note */}
            <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <ShieldCheck size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
              <span>Payouts are processed directly to your Nigerian commercial bank account. Zero transfer fees.</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !verified || !accountName || parseFloat(amount) < 1000 || parseFloat(amount) > walletBalance}
              className="btn btn-primary"
              style={{
                padding: '0.85rem',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: (submitting || !verified || !accountName || parseFloat(amount) < 1000 || parseFloat(amount) > walletBalance) ? 0.6 : 1
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing Withdrawal...</span>
                </>
              ) : (
                <>
                  <span>Request ₦{Number(amount || 0).toLocaleString()} Payout</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WithdrawModal;
