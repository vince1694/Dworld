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
  ArrowRight,
  Info,
  User,
  MessageSquare,
  RefreshCw,
  Phone
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import VerifiedBadge from '../components/VerifiedBadge';
import { getGoogleCalendarUrl, downloadIcsFile } from '../utils/calendar';
import { API_URL } from '../config/api';

const DEFAULT_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM', 
  '01:00 PM', '02:30 PM', '04:00 PM', '05:30 PM'
];

const ALLOWED_SERVICES = [
  'All Specialists',
  'Lash Techs',
  'Nail Techs',
  'Hair Braider (Male & Female)',
  'Wig Installers (Frontal & Others)',
  'Barber',
  'Body Care (Manicure, Pedicure)'
];

const BookAppointment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Wizard Steps: 1: Specialist & Service, 2: Date & Slot, 3: Review & Pay, 4: Confirmed
  const [step, setStep] = useState(1);

  // Data Collections
  const [services, setServices] = useState([]);
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);

  // Filters for Step 1
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState('All Specialists');

  // Booking Selections
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [availableSlots, setAvailableSlots] = useState(DEFAULT_SLOTS);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' | 'paystack'

  // Processing & Confirmation state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // 1. Fetch initial experts, services, and wallet
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [expRes, srvRes, walRes] = await Promise.allSettled([
        axios.get(`${API_URL}/auth/experts`),
        axios.get(`${API_URL}/services`),
        axios.get(`${API_URL}/auth/wallet`)
      ]);

      let expList = [];
      let srvList = [];

      if (expRes.status === 'fulfilled' && expRes.value.data.success) {
        expList = expRes.value.data.data || [];
        setExperts(expList);
      }

      if (srvRes.status === 'fulfilled' && srvRes.value.data.success) {
        srvList = srvRes.value.data.data || [];
        setServices(srvList);
      }

      if (walRes.status === 'fulfilled' && walRes.value.data.success) {
        setWalletBalance(walRes.value.data.data.walletBalance || 0);
      }

      // Check URL parameters for preselection
      const preExpertId = searchParams.get('expertId');
      const preServiceId = searchParams.get('serviceId');

      if (preExpertId && expList.length > 0) {
        const foundExp = expList.find(e => String(e._id || e.id) === String(preExpertId));
        if (foundExp) {
          selectExpertAndService(foundExp, srvList);
          return;
        }
      }

      if (preServiceId && srvList.length > 0) {
        const foundSrv = srvList.find(s => String(s._id || s.id) === String(preServiceId));
        if (foundSrv) {
          // Find the corresponding expert
          const matchingExp = expList.find(e => String(e._id || e.id) === String(foundSrv.stylist_id)) || expList[0];
          setSelectedService(foundSrv);
          if (matchingExp) setSelectedExpert(matchingExp);
          setStep(2);
        }
      }
    } catch (err) {
      console.error('Error loading booking data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to select both expert and their associated single service
  const selectExpertAndService = (expert, allServices = services) => {
    setSelectedExpert(expert);
    setErrorMsg('');

    // Check if expert has services array attached from backend
    if (expert.services && expert.services.length > 0) {
      setSelectedService(expert.services[0]);
    } else {
      // Find matching service in allServices by stylist_id or by name/specialty
      const match = allServices.find(s => 
        String(s.stylist_id) === String(expert._id || expert.id) ||
        (expert.specialty && s.name && s.name.toLowerCase() === expert.specialty.toLowerCase())
      );
      if (match) {
        setSelectedService(match);
      } else {
        // Fallback default single service object
        setSelectedService({
          _id: `srv-${expert._id || expert.id}`,
          name: expert.specialty || 'Campus Styling',
          price: 3500,
          duration: 45,
          description: `${expert.name}'s verified campus specialty service.`,
          location: expert.address || expert.location || 'Lead City University Campus',
          stylist_id: expert._id || expert.id
        });
      }
    }

    setStep(2); // Advance to date & time
  };

  // Fetch available slots when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate]);

  const fetchSlots = async (dateStr) => {
    setLoadingSlots(true);
    try {
      const res = await axios.get(`${API_URL}/appointments/slots?date=${dateStr}`);
      if (res.data.success && Array.isArray(res.data.availableSlots) && res.data.availableSlots.length > 0) {
        setAvailableSlots(res.data.availableSlots);
        if (!res.data.availableSlots.includes(selectedTime)) {
          setSelectedTime(res.data.availableSlots[0] || '10:00 AM');
        }
      } else {
        setAvailableSlots(DEFAULT_SLOTS);
        if (!selectedTime) setSelectedTime('10:00 AM');
      }
    } catch (err) {
      setAvailableSlots(DEFAULT_SLOTS);
      if (!selectedTime) setSelectedTime('10:00 AM');
    } finally {
      setLoadingSlots(false);
    }
  };

  // Next 14 days list for quick picker
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

  // Filtered Experts List
  const filteredExperts = useMemo(() => {
    return experts.filter(exp => {
      // 1. Text Search (name, address, location, specialty)
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const name = (exp.name || '').toLowerCase();
        const address = (exp.address || '').toLowerCase();
        const location = (exp.location || '').toLowerCase();
        const specialty = (exp.specialty || '').toLowerCase();
        const matric = (exp.matricNo || '').toLowerCase();
        const matchesQuery = name.includes(q) || address.includes(q) || location.includes(q) || specialty.includes(q) || matric.includes(q);
        if (!matchesQuery) return false;
      }

      // 2. Specialty Filter
      if (selectedSpecialtyFilter !== 'All Specialists') {
        const spec = (exp.specialty || '').toLowerCase();
        const target = selectedSpecialtyFilter.toLowerCase();
        // Check if specialty matches or if any of expert's services matches
        const matchesSpec = spec.includes(target) || target.includes(spec);
        const matchesService = exp.services?.some(s => s.name?.toLowerCase().includes(target));
        if (!matchesSpec && !matchesService) return false;
      }

      return true;
    });
  }, [experts, searchQuery, selectedSpecialtyFilter]);

  // Handle Return from Paystack Checkout
  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    const aptId = searchParams.get('aptId') || searchParams.get('appointmentId');
    if (reference) {
      axios.post(`${API_URL}/payments/verify`, { reference })
        .then(res => {
          if (res.data.success) {
            setStep(4);
            setConfirmedBooking({
              _id: aptId || 'APT-' + Date.now(),
              paymentStatus: 'paid',
              date: selectedDate,
              time: selectedTime || '10:00 AM',
              service_id: selectedService || { name: 'Campus Specialist Service', price: 3500 },
              stylist_id: selectedExpert || { name: 'Verified Specialist' }
            });
          }
        })
        .catch(err => console.warn('Payment verify notice:', err));
    }
  }, [searchParams]);

  // Complete Booking Flow (Wallet / Paystack)
  const handleConfirmAndPay = async () => {
    if (!selectedExpert || !selectedService) {
      setErrorMsg('Please select a verified specialist and service.');
      return;
    }
    setErrorMsg('');
    setSubmitting(true);

    try {
      // 1. Create Appointment Record
      const bookPayload = {
        service_id: selectedService._id || selectedService.id,
        date: selectedDate,
        time: selectedTime || availableSlots[0] || '10:00 AM',
        notes: clientNotes.trim(),
        stylist_id: selectedExpert._id || selectedExpert.id
      };

      const bookRes = await axios.post(`${API_URL}/appointments/book`, bookPayload);
      if (!bookRes.data.success) {
        throw new Error(bookRes.data.message || 'Failed to reserve appointment');
      }

      const bookedApt = bookRes.data.data;
      const aptId = bookedApt._id || bookedApt.id;

      // 2. Process Payment
      if (paymentMethod === 'wallet') {
        const price = selectedService.price || 0;
        if (walletBalance < price) {
          throw new Error(`Insufficient wallet balance (₦${walletBalance.toLocaleString()}). Please choose Paystack or top up your wallet.`);
        }

        const payRes = await axios.post(`${API_URL}/appointments/${aptId}/pay`);
        if (payRes.data.success) {
          bookedApt.paymentStatus = 'paid';
          setWalletBalance(payRes.data.clientWalletBalance || (walletBalance - price));
        }
      } else if (paymentMethod === 'paystack') {
        const userEmail = (user?.email && user.email.trim()) || '';
        const price = selectedService.price || 0;

        const initRes = await axios.post(`${API_URL}/payments/initialize`, {
          amount: price,
          appointment_id: aptId,
          purpose: 'appointment_pay',
          email: userEmail,
          name: user?.name
        });

        if (initRes.data?.success && initRes.data?.data?.authorization_url) {
          window.location.href = initRes.data.data.authorization_url;
          return;
        } else {
          throw new Error(initRes.data?.message || 'Paystack payment initialization failed');
        }
      }

      setConfirmedBooking({
        ...bookedApt,
        service_id: selectedService,
        stylist_id: selectedExpert
      });
      setStep(4); // Advance to confirmed screen
    } catch (err) {
      console.error('Booking submission error:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Booking could not be finalized. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper container animate-fade-in" style={{ padding: '2rem 1rem 5rem', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* ── Top Header & Wizard Progress ── */}
      {step < 4 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  D.WORLD VERIFIED SPECIALISTS
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>•</span>
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>LCU Campus Network</span>
              </div>
              <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', margin: 0, fontFamily: 'Outfit', color: 'var(--text-main)', letterSpacing: '-0.02em', fontWeight: 900 }}>
                Book Verified Specialist
              </h1>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Select an activated campus expert by location, check availability, and reserve in seconds.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '14px',
                padding: '0.55rem 1rem',
                fontSize: '0.85rem',
                color: 'var(--primary)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.12)'
              }}>
                <Wallet size={16} /> 
                <span>Wallet: ₦{walletBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.5rem',
            background: 'var(--surface)',
            padding: '0.65rem 0.85rem',
            borderRadius: '16px',
            border: '1px solid var(--border-light)'
          }}>
            {[
              { num: 1, title: 'Choose Specialist' },
              { num: 2, title: 'Date & Time' },
              { num: 3, title: 'Review & Pay' }
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
                    borderRadius: '10px',
                    padding: '0.55rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    cursor: s.num <= step ? 'pointer' : 'default',
                    color: isActive ? '#fff' : isDone ? '#10b981' : 'var(--text-muted)',
                    transition: 'all 0.2s',
                    fontSize: '0.825rem',
                    fontWeight: isActive || isDone ? 700 : 500
                  }}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: isActive ? '#fff' : isDone ? '#10b981' : 'rgba(255,255,255,0.1)',
                    color: isActive ? 'var(--primary)' : isDone ? '#fff' : 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', fontWeight: 900
                  }}>
                    {isDone ? <Check size={13} strokeWidth={3} /> : s.num}
                  </span>
                  <span>{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Error Banner ── */}
      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '14px',
          padding: '0.9rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#ef4444',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          <AlertCircle size={18} flexShrink={0} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* STEP 1: VERIFIED EXPERTS & SPECIALISTS DIRECTORY                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          
          {/* Search Bar & Location Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.75rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '1.15rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search specialist by name or campus location (e.g. Unity Hall, Lead City University)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.95rem 1rem 0.95rem 2.85rem',
                  borderRadius: '14px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--surface)',
                  color: 'var(--text-main)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              />
            </div>

            {/* Specialty Filter Chips (Strictly the 6 allowed services) */}
            <div className="chips-scroller" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.35rem' }}>
              {ALLOWED_SERVICES.map(srv => {
                const isSelected = selectedSpecialtyFilter === srv;
                return (
                  <button
                    key={srv}
                    type="button"
                    onClick={() => setSelectedSpecialtyFilter(srv)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '9999px',
                      border: '1.5px solid',
                      borderColor: isSelected ? 'var(--primary)' : 'var(--border-light)',
                      background: isSelected ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'var(--surface)',
                      color: isSelected ? '#fff' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none'
                    }}
                  >
                    {srv}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specialists Grid */}
          {loading ? (
            <div className="flex-center" style={{ minHeight: '300px', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)' }}>
              <RefreshCw size={30} className="animate-spin" color="var(--primary)" />
              <span>Loading verified campus specialists...</span>
            </div>
          ) : filteredExperts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border-light)' }}>
              <User size={48} style={{ opacity: 0.25, margin: '0 auto 1rem' }} />
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>No Specialists Found</h3>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem' }}>
                No verified expert matched "{searchQuery}". Try selecting another specialty or clearing the search.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
              {filteredExperts.map(expert => {
                const primaryService = expert.services?.[0] || {
                  name: expert.specialty || 'Campus Styling',
                  price: 3500,
                  duration: 45,
                  description: `${expert.name}'s verified campus specialty appointment.`
                };

                const expertAddress = expert.address || expert.location || 'Lead City University Campus';

                return (
                  <motion.div
                    key={expert._id || expert.id}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      background: 'var(--surface)',
                      border: '1.5px solid var(--border-light)',
                      borderRadius: '20px',
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1.25rem',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                      position: 'relative'
                    }}
                  >
                    {/* Top Row: Avatar, Identity & Verified Badge */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{
                            width: 52,
                            height: 52,
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15), rgba(124, 58, 237, 0.2))',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: '1.2rem',
                            fontFamily: 'Outfit',
                            border: '1px solid rgba(79, 70, 229, 0.25)',
                            position: 'relative'
                          }}>
                            {expert.name ? expert.name.charAt(0).toUpperCase() : 'E'}
                            <span style={{
                              position: 'absolute',
                              bottom: -2,
                              right: -2,
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              background: '#10b981',
                              border: '2px solid #ffffff'
                            }} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <h3 style={{ margin: 0, fontSize: '1.05rem', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--text-main)' }}>
                                {expert.name}
                              </h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                color: '#d97706',
                                background: '#fffbe8',
                                border: '1px solid #fef3c7',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 800
                              }}>
                                <Star size={11} fill="#d97706" color="#d97706" /> {expert.rating || 4.9}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 600 }}>
                                {expert.matricNo || 'LCU Certified Stylist'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: '#dcfce7',
                          color: '#15803d',
                          border: '1px solid #bbf7d0',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          letterSpacing: '0.03em'
                        }}>
                          <ShieldCheck size={12} /> VERIFIED
                        </span>
                      </div>

                      {/* Prominent Location Address Badge */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '12px',
                        marginBottom: '1rem',
                        color: '#047857',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}>
                        <MapPin size={15} style={{ color: '#10b981', flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'normal', lineHeight: 1.3 }}>
                          {expertAddress}
                        </span>
                      </div>

                      {/* Single Service Details Box */}
                      <div style={{
                        background: 'var(--bg-main, rgba(255, 255, 255, 0.03))',
                        border: '1px solid var(--border-light)',
                        borderRadius: '14px',
                        padding: '0.95rem 1rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                          <strong style={{ fontSize: '0.925rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>
                            {primaryService.name}
                          </strong>
                          <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--secondary)' }}>
                            ₦{primaryService.price?.toLocaleString()}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 0.65rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                          {primaryService.description || expert.bio || 'Verified campus specialist service.'}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 600 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={12} color="var(--primary)" /> {primaryService.duration || 45} mins
                          </span>
                          <span>•</span>
                          <span style={{ color: '#10b981' }}>1-on-1 Campus Session</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={() => selectExpertAndService(expert)}
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1.25rem',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        borderRadius: '12px'
                      }}
                    >
                      Book With {expert.name.split(' ')[0]} <ArrowRight size={15} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* STEP 2: DATE & TIME SLOT PICKER                                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {step === 2 && selectedExpert && selectedService && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          
          {/* Chosen Specialist Snapshot Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(124, 58, 237, 0.08))',
            border: '1.5px solid rgba(79, 70, 229, 0.25)',
            borderRadius: '18px',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '14px',
                background: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.15rem',
                fontFamily: 'Outfit'
              }}>
                {selectedExpert.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'Outfit', fontWeight: 800 }}>
                    {selectedExpert.name}
                  </h3>
                  <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '0.15rem 0.45rem', borderRadius: '6px', fontWeight: 700 }}>
                    Verified
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{selectedService.name} (₦{selectedService.price?.toLocaleString()})</span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={13} color="#10b981" /> {selectedExpert.address || selectedExpert.location || 'Lead City University'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid var(--border-light)',
                borderRadius: '10px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                cursor: 'pointer'
              }}
            >
              Change Specialist
            </button>
          </div>

          {/* Date Picker Section */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-light)',
            borderRadius: '20px',
            padding: '1.75rem',
            marginBottom: '1.75rem'
          }}>
            <h3 style={{ fontSize: '1.15rem', margin: '0 0 1rem', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="var(--primary)" /> 1. Select Date
            </h3>

            {/* Horizontal 14-day scroller */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
              {nextDays.map(d => {
                const isSelected = selectedDate === d.iso;
                return (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => setSelectedDate(d.iso)}
                    style={{
                      flex: '0 0 auto',
                      padding: '0.85rem 1rem',
                      borderRadius: '14px',
                      border: '1.5px solid',
                      borderColor: isSelected ? 'var(--primary)' : 'var(--border-light)',
                      background: isSelected ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'var(--surface)',
                      color: isSelected ? '#fff' : 'var(--text-main)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      minWidth: '92px'
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, display: 'block', opacity: isSelected ? 0.9 : 0.6 }}>
                      {d.dayName}
                    </span>
                    <strong style={{ fontSize: '1.05rem', fontFamily: 'Outfit', display: 'block', marginTop: '0.2rem' }}>
                      {d.monthDay}
                    </strong>
                  </button>
                );
              })}
            </div>

            {/* Manual Date Input */}
            <div style={{ maxWidth: '280px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                Or pick specific calendar date:
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--surface)',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          {/* Time Slot Picker Section */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-light)',
            borderRadius: '20px',
            padding: '1.75rem',
            marginBottom: '1.75rem'
          }}>
            <h3 style={{ fontSize: '1.15rem', margin: '0 0 1rem', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="var(--secondary)" /> 2. Select Time Slot
            </h3>

            {loadingSlots ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Checking available slots...
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
                {availableSlots.map(slot => {
                  const isSelected = selectedTime === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTime(slot)}
                      style={{
                        padding: '0.85rem 0.75rem',
                        borderRadius: '12px',
                        border: '1.5px solid',
                        borderColor: isSelected ? 'var(--secondary)' : 'var(--border-light)',
                        background: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'var(--surface)',
                        color: isSelected ? '#b45309' : 'var(--text-main)',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes for Specialist */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-light)',
            borderRadius: '20px',
            padding: '1.75rem',
            marginBottom: '2rem'
          }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 700, display: 'block', marginBottom: '0.45rem', fontFamily: 'Outfit' }}>
              Optional Note for {selectedExpert.name.split(' ')[0]}
            </label>
            <textarea
              rows="3"
              placeholder="e.g. Bringing my own lace frontal, specific styling preferences, hair texture details..."
              value={clientNotes}
              onChange={e => setClientNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-light)',
                background: 'var(--surface)',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn btn-secondary"
              style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', fontWeight: 700 }}
            >
              <ChevronLeft size={16} /> Back to Specialists
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedTime) {
                  setErrorMsg('Please choose an appointment time slot.');
                  return;
                }
                setErrorMsg('');
                setStep(3);
              }}
              className="btn btn-primary"
              style={{ padding: '0.8rem 2rem', borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem' }}
            >
              Proceed to Review & Pay <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* STEP 3: REVIEW & PAYMENT                                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {step === 3 && selectedExpert && selectedService && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            
            {/* Left: Booking Order Summary */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-light)',
              borderRadius: '20px',
              padding: '1.75rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
            }}>
              <h3 style={{ fontSize: '1.2rem', margin: '0 0 1.25rem', fontFamily: 'Outfit', fontWeight: 800 }}>
                Reservation Summary
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Specialist</span>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', textAlign: 'right' }}>
                    {selectedExpert.name}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Location Spot</span>
                  <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 700, textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={14} color="#10b981" /> {selectedExpert.address || selectedExpert.location || 'Lead City University'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Service</span>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--primary)', textAlign: 'right' }}>
                    {selectedService.name}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Scheduled Time</span>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', textAlign: 'right' }}>
                    {selectedDate} at {selectedTime}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Estimated Duration</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', fontWeight: 600, textAlign: 'right' }}>
                    {selectedService.duration || 45} mins
                  </span>
                </div>
              </div>

              {/* Total Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>Total Fee</span>
                  <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>Zero Hidden Platform Surcharges</span>
                </div>
                <strong style={{ fontSize: '1.6rem', fontFamily: 'Outfit', color: 'var(--secondary)' }}>
                  ₦{(selectedService.price || 0).toLocaleString()}
                </strong>
              </div>
            </div>

            {/* Right: Payment Method Selector */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-light)',
              borderRadius: '20px',
              padding: '1.75rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
            }}>
              <h3 style={{ fontSize: '1.2rem', margin: '0 0 1.25rem', fontFamily: 'Outfit', fontWeight: 800 }}>
                Select Payment Method
              </h3>

              {/* Wallet Option */}
              <div
                onClick={() => setPaymentMethod('wallet')}
                style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  border: '2px solid',
                  borderColor: paymentMethod === 'wallet' ? 'var(--primary)' : 'var(--border-light)',
                  background: paymentMethod === 'wallet' ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)',
                  cursor: 'pointer',
                  marginBottom: '1rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Wallet size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', display: 'block' }}>Student Wallet</strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>1-Click Instant Confirmation</span>
                    </div>
                  </div>
                  <strong style={{ fontSize: '0.95rem', color: walletBalance >= (selectedService.price || 0) ? '#10b981' : '#ef4444' }}>
                    ₦{walletBalance.toLocaleString()}
                  </strong>
                </div>

                {walletBalance < (selectedService.price || 0) && (
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: '#ef4444' }}>
                    ⚠️ Balance is low. Please select Paystack checkout below or top up your wallet.
                  </p>
                )}
              </div>

              {/* Paystack Option */}
              <div
                onClick={() => setPaymentMethod('paystack')}
                style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  border: '2px solid',
                  borderColor: paymentMethod === 'paystack' ? 'var(--primary)' : 'var(--border-light)',
                  background: paymentMethod === 'paystack' ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)',
                  cursor: 'pointer',
                  marginBottom: '1.5rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', display: 'block' }}>Debit Card / Bank Transfer</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Secure checkout via Paystack</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                disabled={submitting || (paymentMethod === 'wallet' && walletBalance < (selectedService.price || 0))}
                onClick={handleConfirmAndPay}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '14px',
                  fontSize: '1rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {submitting ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" /> Processing Reservation...
                  </>
                ) : (
                  <>
                    Confirm & Reserve ₦{(selectedService.price || 0).toLocaleString()} <Check size={18} />
                  </>
                )}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.25rem', borderRadius: '12px', fontWeight: 700 }}
          >
            <ChevronLeft size={16} /> Back to Date & Time
          </button>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* STEP 4: CONFIRMATION & CELEBRATION                                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {step === 4 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '3rem 1.5rem', maxWidth: '640px', margin: '0 auto' }}>
          <div style={{
            width: 76,
            height: 76,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.35)'
          }}>
            <CheckCircle2 size={42} strokeWidth={2.5} />
          </div>

          <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.3rem)', fontFamily: 'Outfit', fontWeight: 900, margin: '0 0 0.5rem' }}>
            Reservation Confirmed! 🎉
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '0 0 2rem', lineHeight: 1.5 }}>
            Your campus booking has been successfully dispatched to <strong>{selectedExpert?.name}</strong>.
          </p>

          {/* Details Card */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-light)',
            borderRadius: '20px',
            padding: '1.5rem',
            textAlign: 'left',
            marginBottom: '2rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.85rem', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Booking Reference</span>
              <strong style={{ fontSize: '0.85rem', color: 'var(--primary)', fontFamily: 'monospace' }}>
                {confirmedBooking?._id || 'APT-' + Date.now()}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.85rem', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Specialist</span>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                {selectedExpert?.name}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.85rem', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Location Spot</span>
              <strong style={{ fontSize: '0.85rem', color: '#047857' }}>
                📍 {selectedExpert?.address || selectedExpert?.location || 'Lead City University'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date & Time</span>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                {selectedDate} at {selectedTime}
              </strong>
            </div>
          </div>

          {/* Action CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.9rem',
                borderRadius: '14px',
                fontWeight: 700,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <MessageSquare size={18} /> Message Specialist Now
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
              style={{
                width: '100%',
                padding: '0.9rem',
                borderRadius: '14px',
                fontWeight: 700,
                fontSize: '0.95rem'
              }}
            >
              View in My Dashboard
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
};

export default BookAppointment;
