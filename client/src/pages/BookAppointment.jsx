import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Calendar, 
  Clock, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  UserCheck, 
  ShieldCheck, 
  CreditCard, 
  Wallet, 
  Star, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  ExternalLink,
  Search,
  Filter,
  Tag,
  ArrowRight,
  Info
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import VerifiedBadge from '../components/VerifiedBadge';
import { getGoogleCalendarUrl, downloadIcsFile } from '../utils/calendar';
import { API_URL } from '../config/api';

const DEFAULT_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM', 
  '01:00 PM', '02:30 PM', '04:00 PM', '05:30 PM'
];

const PAYSTACK_FALLBACK_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

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

const CATEGORIES = ['All', 'Hair', 'Nails', 'Lashes', 'Makeup', 'Barbering', 'Skincare'];

const BookAppointment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Wizard Steps: 1: Service, 2: Specialist, 3: Date & Slot, 4: Review & Pay, 5: Confirmed
  const [step, setStep] = useState(1);

  // Data Collections
  const [services, setServices] = useState([]);
  const [experts, setExperts] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingExperts, setLoadingExperts] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);

  // Form Selections
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [selectedExpert, setSelectedExpert] = useState(null); // null means "Auto-Assign Best Specialist"
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [availableSlots, setAvailableSlots] = useState(DEFAULT_SLOTS);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' | 'paystack' | 'later'

  // Processing state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // 1. Fetch initial services, experts, and wallet
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoadingServices(true);
    setLoadingExperts(true);
    try {
      const [srvRes, expRes, walRes] = await Promise.allSettled([
        axios.get(`${API_URL}/services`),
        axios.get(`${API_URL}/auth/experts`),
        axios.get(`${API_URL}/auth/wallet`)
      ]);

      if (srvRes.status === 'fulfilled' && srvRes.value.data.success) {
        const srvList = srvRes.value.data.data || [];
        setServices(srvList);

        // Preselect from URL if present
        const preServiceId = searchParams.get('serviceId');
        if (preServiceId) {
          const match = srvList.find(s => (s._id || s.id) === preServiceId);
          if (match) {
            setSelectedService(match);
            setStep(2); // Auto advance to expert selection
          }
        }
      }

      if (expRes.status === 'fulfilled' && expRes.value.data.success) {
        const expList = expRes.value.data.data || [];
        setExperts(expList);

        // Preselect expert from URL if present
        const preExpertId = searchParams.get('expertId');
        if (preExpertId) {
          const match = expList.find(e => (e._id || e.id) === preExpertId);
          if (match) setSelectedExpert(match);
        }
      }

      if (walRes.status === 'fulfilled' && walRes.value.data.success) {
        setWalletBalance(walRes.value.data.data.walletBalance || 0);
      }
    } catch (err) {
      console.error('Error loading booking data:', err);
    } finally {
      setLoadingServices(false);
      setLoadingExperts(false);
    }
  };

  // 2. Fetch slots when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate]);

  const fetchSlots = async (dateStr) => {
    setLoadingSlots(true);
    try {
      const res = await axios.get(`${API_URL}/appointments/slots?date=${dateStr}`);
      if (res.data.success && Array.isArray(res.data.availableSlots)) {
        setAvailableSlots(res.data.availableSlots);
        if (!res.data.availableSlots.includes(selectedTime)) {
          setSelectedTime(res.data.availableSlots[0] || '');
        }
      } else {
        setAvailableSlots(DEFAULT_SLOTS);
      }
    } catch (err) {
      setAvailableSlots(DEFAULT_SLOTS);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Upcoming 14 days list
  const nextDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days.push({ iso, dayName, monthDay });
    }
    return days;
  }, []);

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter(srv => {
      const q = searchQuery.toLowerCase();
      const matchSearch = (srv.name || '').toLowerCase().includes(q) ||
                          (srv.description || '').toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (selectedCategory !== 'All') {
        const cat = (srv.category || '').toLowerCase();
        const name = (srv.name || '').toLowerCase();
        const target = selectedCategory.toLowerCase();
        if (!cat.includes(target) && !name.includes(target)) return false;
      }
      return true;
    });
  }, [services, searchQuery, selectedCategory]);

  // Step 4 Complete Booking Flow
  const handleConfirmAndPay = async () => {
    setErrorMsg('');
    setSubmitting(true);

    try {
      // 1. Submit appointment booking to backend
      const bookPayload = {
        service_id: selectedService._id || selectedService.id,
        date: selectedDate,
        time: selectedTime || availableSlots[0] || '10:00 AM',
        notes: clientNotes.trim(),
        stylist_id: selectedExpert ? (selectedExpert._id || selectedExpert.id) : null
      };

      const bookRes = await axios.post(`${API_URL}/appointments/book`, bookPayload);
      if (!bookRes.data.success) {
        throw new Error(bookRes.data.message || 'Failed to reserve appointment');
      }

      const bookedApt = bookRes.data.data;
      const aptId = bookedApt._id || bookedApt.id;

      // 2. Handle Payment Method
      if (paymentMethod === 'wallet') {
        // Attempt instant wallet payment
        const payRes = await axios.post(`${API_URL}/appointments/${aptId}/pay-wallet`);
        if (payRes.data.success) {
          bookedApt.paymentStatus = 'paid';
          setWalletBalance(payRes.data.clientWalletBalance);
        }
      } else if (paymentMethod === 'paystack') {
        // Paystack inline popup or redirect
        const userEmail = (user?.email && user.email.trim()) || '';
        const price = selectedService.price || 0;

        await loadPaystackScript();

        let popupSucceeded = false;
        if (typeof window.PaystackPop !== 'undefined' && userEmail) {
          await new Promise((resolve) => {
            const handler = window.PaystackPop.setup({
              key: PAYSTACK_FALLBACK_KEY,
              email: userEmail,
              amount: price * 100,
              currency: 'NGN',
              ref: 'APT-' + aptId + '-' + Date.now(),
              metadata: {
                appointment_id: aptId,
                purpose: 'appointment_pay',
                client_name: user?.name
              },
              callback: async (resp) => {
                try {
                  await axios.post(`${API_URL}/payments/verify`, { reference: resp.reference });
                  bookedApt.paymentStatus = 'paid';
                  popupSucceeded = true;
                } catch (e) {
                  console.error('Paystack verify error:', e);
                } finally {
                  resolve();
                }
              },
              onClose: () => resolve()
            });
            handler.openIframe();
          });
        }

        // If popup was closed without pay, user can still settle from dashboard
      }

      setConfirmedBooking({
        ...bookedApt,
        service_id: selectedService,
        stylist_id: selectedExpert || { name: 'Auto-Matched Specialist' }
      });
      setStep(5); // Advance to celebration screen
    } catch (err) {
      console.error('Booking submission error:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Booking could not be finalized. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper container animate-fade-in" style={{ padding: '1.5rem 1rem 5rem', maxWidth: '1080px', margin: '0 auto' }}>
      
      {/* ── Top Header & Wizard Progress ── */}
      {step < 5 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  D.WORLD CAMPUS SCHEDULING
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>•</span>
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>100% Refund Guarantee</span>
              </div>
              <h1 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', margin: 0, fontFamily: 'Outfit', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Reserve Your Appointment
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '12px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.8rem',
                color: 'var(--primary)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <Wallet size={15} /> Balance: ₦{walletBalance.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem',
            background: 'var(--surface)',
            padding: '0.65rem 0.85rem',
            borderRadius: '14px',
            border: '1px solid var(--border-light)'
          }}>
            {[
              { num: 1, title: 'Service' },
              { num: 2, title: 'Specialist' },
              { num: 3, title: 'Date & Time' },
              { num: 4, title: 'Checkout' }
            ].map(s => {
              const isActive = step === s.num;
              const isDone = step > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < step) setStep(s.num);
                  }}
                  disabled={s.num > step}
                  style={{
                    background: isActive ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : isDone ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.4rem 0.6rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    cursor: s.num <= step ? 'pointer' : 'default',
                    color: isActive ? '#fff' : isDone ? '#10b981' : 'var(--text-muted)',
                    transition: 'all 0.2s',
                    fontSize: '0.78rem',
                    fontWeight: isActive || isDone ? 700 : 500
                  }}
                >
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: isActive ? '#fff' : isDone ? '#10b981' : 'rgba(255,255,255,0.1)',
                    color: isActive ? 'var(--primary)' : isDone ? '#fff' : 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 800
                  }}>
                    {isDone ? <Check size={12} strokeWidth={3} /> : s.num}
                  </span>
                  <span className="admin-hide-mobile">{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Error Banner ── */}
      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          color: '#f87171',
          fontSize: '0.875rem',
          fontWeight: 500
        }}>
          <AlertCircle size={18} flexShrink={0} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* STEP 1: SERVICE SELECTION                                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {/* Category Tabs & Search Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search hairstyle, lashes, pedicure, haircut..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem 0.85rem 2.6rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--surface)',
                  color: 'var(--text-main)',
                  fontSize: '0.925rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Horizontal Category Scroller */}
            <div className="chips-scroller">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '0.5rem 1.1rem',
                    borderRadius: '9999px',
                    border: '1px solid',
                    borderColor: selectedCategory === cat ? 'var(--primary)' : 'var(--border-light)',
                    background: selectedCategory === cat ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'var(--surface)',
                    color: selectedCategory === cat ? '#fff' : 'var(--text-muted)',
                    fontSize: '0.825rem',
                    fontWeight: selectedCategory === cat ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Service Cards Grid */}
          {loadingServices ? (
            <div className="flex-center" style={{ minHeight: '260px', color: 'var(--text-muted)' }}>
              Loading verified campus services...
            </div>
          ) : filteredServices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: '16px' }}>
              No services matched "{searchQuery}". Try selecting another category.
            </div>
          ) : (
            <div className="grid-layout grid-cols-1 md:grid-cols-2" style={{ gap: '1rem', marginBottom: '2rem' }}>
              {filteredServices.map(srv => {
                const isChosen = (selectedService?._id || selectedService?.id) === (srv._id || srv.id);
                return (
                  <div
                    key={srv._id || srv.id}
                    onClick={() => setSelectedService(srv)}
                    className="hover-card-select"
                    style={{
                      padding: '1.25rem',
                      borderRadius: '16px',
                      background: isChosen ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)',
                      border: isChosen ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'Outfit', color: 'var(--text-main)', fontWeight: 700 }}>
                          {srv.name}
                        </h3>
                        <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--secondary)', fontFamily: 'Outfit', flexShrink: 0 }}>
                          ₦{srv.price?.toLocaleString()}
                        </span>
                      </div>

                      <p style={{ margin: '0 0 0.85rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                        {srv.description || 'Professional beauty & styling session provided by verified Lead City University specialists.'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={13} color="var(--primary)" /> {srv.duration || 45} mins
                        </span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <MapPin size={13} color="#10b981" /> {srv.location || 'Studio 4'}
                        </span>
                      </div>

                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        border: isChosen ? 'none' : '2px solid var(--border-light)',
                        background: isChosen ? 'var(--primary)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '0.7rem'
                      }}>
                        {isChosen && <Check size={14} strokeWidth={3} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 1 Footer Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', position: 'sticky', bottom: '1rem', zIndex: 30 }}>
            <button
              type="button"
              disabled={!selectedService}
              onClick={() => setStep(2)}
              className="btn btn-primary"
              style={{
                padding: '0.85rem 2rem',
                fontSize: '0.95rem',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
                opacity: selectedService ? 1 : 0.5
              }}
            >
              <span>Continue to Specialist</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* STEP 2: SPECIALIST SELECTION                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.35rem', fontFamily: 'Outfit' }}>
              Choose Your Verified Artisan
            </h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              All specialists undergo campus matriculation and identity verification.
            </p>
          </div>

          <div className="grid-layout grid-cols-1 md:grid-cols-2" style={{ gap: '1rem', marginBottom: '2rem' }}>
            
            {/* Option A: Auto-assign */}
            <div
              onClick={() => setSelectedExpert(null)}
              className="hover-card-select"
              style={{
                padding: '1.25rem',
                borderRadius: '16px',
                background: selectedExpert === null ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)',
                border: selectedExpert === null ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: '14px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', flexShrink: 0
              }}>
                <Sparkles size={24} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>
                    Auto-Match Best Specialist
                  </strong>
                  <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', fontWeight: 700 }}>
                    FASTEST
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  We will assign the highest-rated verified specialist available for your chosen time.
                </p>
              </div>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                border: selectedExpert === null ? 'none' : '2px solid var(--border-light)',
                background: selectedExpert === null ? 'var(--primary)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '0.7rem'
              }}>
                {selectedExpert === null && <Check size={14} strokeWidth={3} />}
              </div>
            </div>

            {/* Individual Expert Cards */}
            {experts.map(exp => {
              const isChosen = selectedExpert && (selectedExpert._id || selectedExpert.id) === (exp._id || exp.id);
              return (
                <div
                  key={exp._id || exp.id}
                  onClick={() => setSelectedExpert(exp)}
                  className="hover-card-select"
                  style={{
                    padding: '1.25rem',
                    borderRadius: '16px',
                    background: isChosen ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)',
                    border: isChosen ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: '14px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0
                  }}>
                    {exp.name?.charAt(0) || 'E'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                      <strong style={{ fontSize: '0.975rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>
                        {exp.name}
                      </strong>
                      <VerifiedBadge size={14} />
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.2rem' }}>
                      {exp.specialty || 'General Beauty & Hair Expert'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#f59e0b', fontWeight: 700 }}>
                        <Star size={12} fill="#f59e0b" /> 4.9
                      </span>
                      <span>•</span>
                      <span>{exp.matricNo || 'LCU/UG/Verified'}</span>
                    </div>
                  </div>

                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: isChosen ? 'none' : '2px solid var(--border-light)',
                    background: isChosen ? 'var(--primary)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '0.7rem'
                  }}>
                    {isChosen && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step 2 Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn btn-secondary"
              style={{ padding: '0.75rem 1.5rem', borderRadius: '12px' }}
            >
              <ChevronLeft size={16} /> Back
            </button>

            <button
              type="button"
              onClick={() => setStep(3)}
              className="btn btn-primary"
              style={{ padding: '0.85rem 2rem', borderRadius: '12px' }}
            >
              <span>Continue to Schedule</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* STEP 3: DATE & TIME SLOT SELECTION                                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {/* 14 Days Date Strip */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
              Select Appointment Date
            </label>
            <div className="chips-scroller" style={{ paddingBottom: '0.5rem', gap: '0.65rem' }}>
              {nextDays.map(d => {
                const isSelected = selectedDate === d.iso;
                return (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => setSelectedDate(d.iso)}
                    style={{
                      minWidth: '78px',
                      padding: '0.75rem 0.5rem',
                      borderRadius: '14px',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                      background: isSelected ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'var(--surface)',
                      color: isSelected ? '#fff' : 'var(--text-main)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.2rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? '0 6px 18px rgba(99, 102, 241, 0.3)' : 'none'
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: isSelected ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)' }}>
                      {d.dayName}
                    </span>
                    <strong style={{ fontSize: '0.95rem', fontFamily: 'Outfit' }}>
                      {d.monthDay}
                    </strong>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slot Picker */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Available Time Slots for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
              </label>
              {loadingSlots && <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Checking live slots...</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.65rem' }}>
              {availableSlots.map(time => {
                const isChosen = selectedTime === time;
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setSelectedTime(time)}
                    style={{
                      padding: '0.75rem 0.5rem',
                      borderRadius: '12px',
                      border: isChosen ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                      background: isChosen ? 'rgba(99, 102, 241, 0.12)' : 'var(--surface)',
                      color: isChosen ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: isChosen ? 800 : 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Clock size={13} />
                    <span>{time}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Client Notes / Requests */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              Special instructions, hairstyle references, or arrival notes (optional):
            </label>
            <textarea
              rows="3"
              placeholder="e.g. Please bring extra braiding hair, or let me know if you need pictures of my current length..."
              value={clientNotes}
              onChange={e => setClientNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '12px',
                border: '1px solid var(--border-light)',
                background: 'var(--surface)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Step 3 Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn btn-secondary"
              style={{ padding: '0.75rem 1.5rem', borderRadius: '12px' }}
            >
              <ChevronLeft size={16} /> Back
            </button>

            <button
              type="button"
              disabled={!selectedTime}
              onClick={() => setStep(4)}
              className="btn btn-primary"
              style={{
                padding: '0.85rem 2rem',
                borderRadius: '12px',
                opacity: selectedTime ? 1 : 0.5
              }}
            >
              <span>Review & Pay</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* STEP 4: REVIEW & INSTANT CHECKOUT                                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {step === 4 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className="grid-layout grid-cols-1 md:grid-cols-2" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
            
            {/* Left: Summary Receipt Card */}
            <div className="app-card" style={{ padding: '1.5rem', borderRadius: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
                <ShieldCheck size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontFamily: 'Outfit' }}>Booking Summary</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Service</span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'Outfit' }}>
                    {selectedService?.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {selectedService?.duration || 45} mins • {selectedService?.location || 'Lead City Studio 4'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Specialist</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {selectedExpert?.name || 'Auto-Matched Best Specialist'}
                    {selectedExpert && <VerifiedBadge size={14} />}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Schedule</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    📅 {selectedDate} at ⏰ {selectedTime}
                  </div>
                </div>

                {clientNotes && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Client Notes</span>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      "{clientNotes}"
                    </div>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '14px', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  <span>Service Fee</span>
                  <span>₦{selectedService?.price?.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#10b981', marginBottom: '0.75rem' }}>
                  <span>Buyer Protection & Guarantee</span>
                  <span>FREE</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)', fontSize: '1.25rem', fontWeight: 900, fontFamily: 'Outfit', color: 'var(--text-main)' }}>
                  <span>Total Amount</span>
                  <span style={{ color: 'var(--secondary)' }}>₦{selectedService?.price?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Right: Payment Method Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontFamily: 'Outfit' }}>Select Payment Option</h3>

              {/* Method 1: Wallet Pay */}
              <div
                onClick={() => setPaymentMethod('wallet')}
                className="hover-card-select"
                style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  background: paymentMethod === 'wallet' ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)',
                  border: paymentMethod === 'wallet' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '12px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--primary)', flexShrink: 0
                }}>
                  <Wallet size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>D.WORLD Wallet Balance</strong>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: walletBalance >= (selectedService?.price || 0) ? '#10b981' : '#f87171' }}>
                      ₦{walletBalance.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {walletBalance >= (selectedService?.price || 0) 
                      ? 'Instant 1-click booking confirmation & deduction' 
                      : `Insufficient balance (Need ₦${((selectedService?.price || 0) - walletBalance).toLocaleString()} more)`}
                  </div>
                </div>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: paymentMethod === 'wallet' ? 'none' : '2px solid var(--border-light)',
                  background: paymentMethod === 'wallet' ? 'var(--primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '0.7rem'
                }}>
                  {paymentMethod === 'wallet' && <Check size={12} strokeWidth={3} />}
                </div>
              </div>

              {/* Method 2: Paystack Instant */}
              <div
                onClick={() => setPaymentMethod('paystack')}
                className="hover-card-select"
                style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  background: paymentMethod === 'paystack' ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)',
                  border: paymentMethod === 'paystack' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#10b981', flexShrink: 0
                }}>
                  <CreditCard size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>Paystack Direct Checkout</strong>
                    <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 700 }}>
                      POPULAR
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Pay securely with ATM Card, USSD, or Bank Transfer
                  </div>
                </div>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: paymentMethod === 'paystack' ? 'none' : '2px solid var(--border-light)',
                  background: paymentMethod === 'paystack' ? 'var(--primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '0.7rem'
                }}>
                  {paymentMethod === 'paystack' && <Check size={12} strokeWidth={3} />}
                </div>
              </div>

              {/* Method 3: Pay Later */}
              <div
                onClick={() => setPaymentMethod('later')}
                className="hover-card-select"
                style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  background: paymentMethod === 'later' ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)',
                  border: paymentMethod === 'later' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#f59e0b', flexShrink: 0
                }}>
                  <Clock size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', display: 'block', marginBottom: '0.15rem' }}>
                    Reserve Slot & Pay Later
                  </strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Lock in your calendar slot now; settle via dashboard before appointment begins
                  </div>
                </div>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: paymentMethod === 'later' ? 'none' : '2px solid var(--border-light)',
                  background: paymentMethod === 'later' ? 'var(--primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '0.7rem'
                }}>
                  {paymentMethod === 'later' && <Check size={12} strokeWidth={3} />}
                </div>
              </div>

              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '12px',
                padding: '0.85rem',
                fontSize: '0.78rem',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                lineHeight: 1.4
              }}>
                <ShieldCheck size={16} flexShrink={0} />
                <span>100% money-back guarantee if you cancel before appointment start time.</span>
              </div>
            </div>
          </div>

          {/* Step 4 Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setStep(3)}
              className="btn btn-secondary"
              style={{ padding: '0.75rem 1.5rem', borderRadius: '12px' }}
            >
              <ChevronLeft size={16} /> Back
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmAndPay}
              className="btn btn-primary"
              style={{
                padding: '0.95rem 2.25rem',
                borderRadius: '14px',
                fontSize: '1rem',
                fontWeight: 800,
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
              }}
            >
              {submitting ? (
                <span>Confirming Booking...</span>
              ) : (
                <span>Confirm & Complete Booking 🚀</span>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* STEP 5: BOOKING CELEBRATION & RECEIPT                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {step === 5 && confirmedBooking && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          transition={{ duration: 0.35 }}
          className="app-card"
          style={{ maxWidth: '620px', margin: '0 auto', padding: '2.5rem 1.75rem', borderRadius: '24px', textAlign: 'center' }}
        >
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', margin: '0 auto 1.25rem',
            boxShadow: '0 0 35px rgba(16, 185, 129, 0.4)'
          }}>
            <CheckCircle2 size={40} />
          </div>

          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            APPOINTMENT CONFIRMED 🎉
          </span>

          <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.1rem)', margin: '0.35rem 0 0.5rem', fontFamily: 'Outfit' }}>
            You're All Set!
          </h2>

          <p style={{ margin: '0 0 1.75rem', color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            Your session for <strong>{selectedService?.name}</strong> has been scheduled with <strong>{confirmedBooking.stylist_id?.name || 'your assigned specialist'}</strong>.
          </p>

          {/* Receipt Box */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '16px',
            border: '1px solid var(--border-light)',
            padding: '1.25rem',
            textAlign: 'left',
            marginBottom: '1.75rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>DATE</span>
                <strong>{confirmedBooking.date}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>TIME</span>
                <strong>{confirmedBooking.time}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>PAYMENT STATUS</span>
                <span style={{ color: confirmedBooking.paymentStatus === 'paid' ? '#10b981' : '#f59e0b', fontWeight: 800, textTransform: 'uppercase' }}>
                  {confirmedBooking.paymentStatus === 'paid' ? 'Paid (Settled)' : 'Pending (Pay at studio)'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>LOCATION</span>
                <strong>{selectedService?.location || 'Lead City Studio 4'}</strong>
              </div>
            </div>
          </div>

          {/* Calendar Sync Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <a
              href={getGoogleCalendarUrl(confirmedBooking)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.15rem',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                color: 'var(--primary)',
                textDecoration: 'none',
                fontSize: '0.825rem',
                fontWeight: 600
              }}
            >
              <ExternalLink size={14} /> Add to Google Calendar
            </a>

            <button
              type="button"
              onClick={() => downloadIcsFile(confirmedBooking)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.15rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-main)',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Download size={14} /> Download .ICS (Apple/Outlook)
            </button>
          </div>

          {/* Final Navigation Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setSelectedService(null);
                setConfirmedBooking(null);
              }}
              className="btn btn-secondary"
              style={{ padding: '0.75rem 1.25rem', borderRadius: '12px' }}
            >
              Book Another
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.5rem', borderRadius: '12px' }}
            >
              Go to My Dashboard
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
};

export default BookAppointment;
