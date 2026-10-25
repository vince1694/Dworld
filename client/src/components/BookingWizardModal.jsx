import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Calendar as CalendarIcon, 
  Clock, 
  Sparkles, 
  DollarSign, 
  UserCheck, 
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Wallet,
  CreditCard,
  Lock,
  ShieldCheck
} from 'lucide-react';
import axios from 'axios';

import { useAuth } from '../context/AuthContext';
import VerifiedBadge from './VerifiedBadge';
import { getGoogleCalendarUrl, downloadIcsFile } from '../utils/calendar';

import { API_URL } from '../config/api';

const DEFAULT_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM', 
  '01:00 PM', '02:30 PM', '04:00 PM', '05:30 PM'
];

const BookingWizardModal = ({ isOpen, onClose, onBookingSuccess, preselectedServiceId }) => {
  const { user, refreshUser, updateUserCache } = useAuth();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  
  // Selection States
  const [wizardTier, setWizardTier] = useState('all');
  const [selectedService, setSelectedService] = useState(null);
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [expertsList, setExpertsList] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState(DEFAULT_SLOTS);
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  
  // Payment States
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [walletBalance, setWalletBalance] = useState(user?.walletBalance || 0);
  const [confirmedBookingData, setConfirmedBookingData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [bookingComplete, setBookingComplete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchServices();
      fetchVerifiedExperts();
      fetchUserWallet();
      setStep(1);
      setBookingComplete(false);
      setErrorMsg('');
      if (!selectedDate) {
        setSelectedDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen]);

  const fetchUserWallet = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/me`);
      if (res.data?.success && res.data?.user) {
        setWalletBalance(res.data.user.walletBalance || 0);
        if (updateUserCache) updateUserCache({ walletBalance: res.data.user.walletBalance || 0 });
      }
    } catch (e) {
      if (user?.walletBalance !== undefined) {
        setWalletBalance(user.walletBalance);
      }
    }
  };

  const fetchVerifiedExperts = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/experts`);
      if (res.data.success) {
        setExpertsList(res.data.data);
        if (res.data.data.length > 0 && !selectedExpert) {
          setSelectedExpert(res.data.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load verified experts', err);
    }
  };

  // When services load or preselectedServiceId changes, preselect the service
  useEffect(() => {
    if (services.length > 0 && preselectedServiceId) {
      const match = services.find(s => s._id === preselectedServiceId || s.id === preselectedServiceId);
      if (match) {
        setSelectedService(match);
      }
    }
  }, [services, preselectedServiceId]);

  // Fetch available slots when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchSlotsForDate(selectedDate);
    }
  }, [selectedDate]);

  const fetchServices = async () => {
    try {
      setLoadingServices(true);
      const res = await axios.get(`${API_URL}/services`);
      if (res.data.success) {
        setServices(res.data.data);
        if (!selectedService && res.data.data.length > 0 && !preselectedServiceId) {
          setSelectedService(res.data.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load services', err);
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchSlotsForDate = async (dateStr) => {
    try {
      const expertId = selectedExpert ? (selectedExpert._id || selectedExpert.id) : (selectedService?.stylist_id || '');
      const slotsUrl = expertId
        ? `${API_URL}/appointments/slots?date=${dateStr}&stylist_id=${expertId}`
        : `${API_URL}/appointments/slots?date=${dateStr}`;
      const res = await axios.get(slotsUrl);
      if (res.data.success && res.data.data && res.data.data.length > 0) {
        const slotsFromBackend = res.data.data.map(s => s.time || s);
        setAvailableSlots(slotsFromBackend);
      } else {
        setAvailableSlots(DEFAULT_SLOTS);
      }
    } catch (err) {
      setAvailableSlots(DEFAULT_SLOTS);
    }
  };

  const handleNextStep = () => {
    setErrorMsg('');
    if (step === 1 && !selectedService) {
      setErrorMsg('Please select a service to continue.');
      return;
    }
    if (step === 2) {
      if (!selectedDate) {
        setErrorMsg('Please select a date.');
        return;
      }
      if (!selectedTime) {
        setErrorMsg('Please select an available time slot.');
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setStep(prev => prev - 1);
  };

  const handleConfirmBooking = async () => {
    if (!user) {
      setErrorMsg('Please log in to your D.WORLD account to complete your booking.');
      return;
    }

    if (user && (user.role === 'expert' || user.role === 'stylist')) {
      setErrorMsg('You are logged in as an Expert. Only customer/student accounts can book appointments.');
      return;
    }

    if (!selectedService || !selectedDate || !selectedTime) {
      setErrorMsg('Missing required booking parameters.');
      return;
    }

    const price = parseFloat(selectedService.price || 0);

    if (paymentMethod === 'wallet' && walletBalance < price) {
      setErrorMsg(`Insufficient wallet balance (₦${walletBalance.toLocaleString()}). Please select Paystack (Card / Bank Transfer) or top up your wallet.`);
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      const payload = {
        service_id: selectedService._id || selectedService.id,
        stylist_id: selectedExpert ? (selectedExpert._id || selectedExpert.id) : (selectedService.stylist_id || null),
        date: selectedDate,
        time: selectedTime,
        notes,
        paymentMethod: paymentMethod === 'wallet' ? 'wallet' : 'paystack'
      };

      if (paymentMethod === 'wallet') {
        const res = await axios.post(`${API_URL}/appointments/book`, payload);
        if (res.data.success) {
          const newBal = res.data.clientWalletBalance !== undefined ? res.data.clientWalletBalance : Math.max(0, walletBalance - price);
          setWalletBalance(newBal);
          if (updateUserCache) updateUserCache({ walletBalance: newBal });
          if (refreshUser) refreshUser();
          setConfirmedBookingData(res.data.data);
          setBookingComplete(true);
          if (onBookingSuccess) {
            onBookingSuccess(res.data.data || res.data);
          }
        } else {
          throw new Error(res.data.message || 'Payment processing failed');
        }
      } else if (paymentMethod === 'paystack') {
        // Create appointment awaiting Paystack payment
        const res = await axios.post(`${API_URL}/appointments/book`, { ...payload, paymentMethod: 'unpaid' });
        if (!res.data.success) {
          throw new Error(res.data.message || 'Failed to initialize booking');
        }
        const bookedApt = res.data.data;
        const aptId = bookedApt._id || bookedApt.id;

        // Ensure Paystack inline script is ready
        if (typeof window.PaystackPop === 'undefined') {
          const script = document.createElement('script');
          script.src = 'https://js.paystack.co/v1/inline.js';
          script.async = true;
          document.head.appendChild(script);
          await new Promise((resolve) => { script.onload = resolve; script.onerror = resolve; });
        }

        let publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';
        try {
          const configRes = await axios.get(`${API_URL}/payments/config`);
          if (configRes.data.success && configRes.data.publicKey) {
            publicKey = configRes.data.publicKey;
          }
        } catch (e) {}

        const userEmail = (user?.email && user.email.trim()) || 'student@dworld.ink';

        if (typeof window.PaystackPop !== 'undefined' && publicKey) {
          const handler = window.PaystackPop.setup({
            key: publicKey,
            email: userEmail,
            amount: Math.round(price * 100),
            currency: 'NGN',
            ref: 'APT-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            metadata: {
              purpose: 'appointment_pay',
              appointment_id: aptId,
              user_id: user?.id || user?._id
            },
            callback: async (response) => {
              try {
                setSubmitting(true);
                const verifyRes = await axios.post(`${API_URL}/payments/verify`, {
                  reference: response.reference
                });
                if (verifyRes.data.success) {
                  bookedApt.paymentStatus = 'paid';
                  setConfirmedBookingData(bookedApt);
                  if (refreshUser) refreshUser();
                  setBookingComplete(true);
                  if (onBookingSuccess) {
                    onBookingSuccess(bookedApt);
                  }
                } else {
                  setErrorMsg(verifyRes.data.message || 'Payment verification failed');
                }
              } catch (err) {
                setErrorMsg('Payment verification failed. Please contact support.');
              } finally {
                setSubmitting(false);
              }
            },
            onClose: () => {
              setSubmitting(false);
            }
          });
          handler.openIframe();
        } else {
          // Fallback to server initialize
          const initRes = await axios.post(`${API_URL}/payments/initialize`, {
            amount: price,
            email: userEmail,
            purpose: 'appointment_pay',
            appointment_id: aptId
          });
          if (initRes.data.success && initRes.data.data?.authorization_url) {
            window.location.href = initRes.data.data.authorization_url;
          } else {
            throw new Error('Unable to start Paystack checkout. Please try again.');
          }
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Booking failed. Please check date/time availability.');
    } finally {
      if (paymentMethod !== 'paystack') {
        setSubmitting(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="modal-card"
        style={{ padding: '2rem' }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', margin: 0, fontFamily: 'Outfit' }}>
                {bookingComplete ? 'Booking Confirmed' : 'Book Appointment'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {bookingComplete ? 'Your reservation is locked in.' : `Step ${step} of 3 — Interactive Booking Wizard`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {!bookingComplete ? (
          <>
            {/* Step Wizard Progress Pills */}
            <div className="wizard-steps">
              <div className={`wizard-step-item ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
                {step > 1 ? <Check size={18} /> : 1}
              </div>
              <div className={`wizard-step-item ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
                {step > 2 ? <Check size={18} /> : 2}
              </div>
              <div className={`wizard-step-item ${step === 3 ? 'active' : ''}`}>
                3
              </div>
            </div>

            {errorMsg && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                color: '#f87171',
                fontSize: '0.875rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} />
                {errorMsg}
              </div>
            )}

            {/* STEP 1: SERVICE TIER & OFFERING SELECTION */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--text-main)', margin: 0, fontFamily: 'Outfit' }}>
                    Select Service & Package Tier
                  </h4>
                  {selectedExpert && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.08))',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '9999px',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)',
                      flexWrap: 'wrap'
                    }}>
                      <VerifiedBadge size="small" text="VERIFIED" />
                      <span style={{ fontSize: '0.775rem', color: '#065f46', fontWeight: 700 }}>
                        Verified Specialist: <strong style={{ color: '#047857' }}>{selectedExpert.name}</strong> • <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{selectedExpert.matricNo || 'LCU/UG/22/04192'}</span> • <span style={{ color: 'var(--secondary)', fontWeight: 700 }}>{selectedExpert.department || 'Cosmetology & Campus Styling'}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Dedicated Page Shortcut */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: 'rgba(99, 102, 241, 0.08)', padding: '0.65rem 1rem', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                    ✨ Choose your certified campus specialist below:
                  </span>
                  <a
                    href="/book"
                    onClick={(e) => {
                      e.preventDefault();
                      onClose();
                      window.location.href = '/book';
                    }}
                    style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    Open Full Page ↗
                  </a>
                </div>

                {expertsList.length === 0 && loadingServices ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading verified specialists & services...
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.9rem', maxHeight: '360px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                    {expertsList.map((exp) => {
                      const expId = String(exp._id || exp.id);
                      const isSelected = selectedExpert && String(selectedExpert._id || selectedExpert.id) === expId;
                      const expService = exp.services?.[0] || services.find(s => String(s.stylist_id) === expId) || {
                        name: exp.specialty || 'Campus Styling',
                        price: 3500,
                        duration: 45,
                        description: `${exp.name}'s campus specialty service.`
                      };

                      return (
                        <div
                          key={expId}
                          onClick={() => {
                            setSelectedExpert(exp);
                            setSelectedService(expService);
                            setErrorMsg('');
                          }}
                          className="hover-card-select"
                          style={{
                            padding: '1.15rem',
                            borderRadius: '16px',
                            background: isSelected ? 'rgba(79, 70, 229, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            pointerEvents: 'auto',
                            position: 'relative'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <div style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: '10px',
                                  background: 'var(--primary)',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '0.95rem',
                                  fontFamily: 'Outfit'
                                }}>
                                  {exp.name ? exp.name.charAt(0).toUpperCase() : 'E'}
                                </div>
                                <div>
                                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)', fontFamily: 'Outfit', display: 'block' }}>
                                    {exp.name}
                                  </span>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                                    {exp.matricNo || 'Verified Expert'}
                                  </span>
                                </div>
                              </div>
                              {isSelected && (
                                <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '50%', padding: '0.15rem', display: 'flex' }}>
                                  <Check size={14} />
                                </span>
                              )}
                            </div>

                            {/* Location Badge */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: 'rgba(16, 185, 129, 0.08)',
                              color: '#047857',
                              padding: '0.25rem 0.55rem',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              marginBottom: '0.65rem'
                            }}>
                              <MapPin size={12} color="#10b981" />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {exp.address || exp.location || 'Campus Area, Ibadan'}
                              </span>
                            </div>

                            {/* Service and Price */}
                            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '0.65rem 0.75rem', borderRadius: '10px', marginBottom: '0.5rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>
                                  {expService.name}
                                </strong>
                                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--secondary)' }}>
                                  ₦{expService.price?.toLocaleString()}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                                ⏱ {expService.duration || 45} mins • 1-on-1 Session
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }}>
                              {isSelected ? '✓ Selected' : 'Tap to Select'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 2: DATE & TIME SLOT PICKER */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <div className="input-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarIcon size={16} color="var(--primary)" /> Pick Preferred Date
                  </label>
                  <input 
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                  {(() => {
                    if (!selectedDate) return null;
                    const dateObj = new Date(selectedDate + 'T00:00:00');
                    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const dayName = days[dateObj.getDay()];
                    const isStylistOff = selectedExpert?.workingDays && selectedExpert.workingDays.length > 0
                      ? !selectedExpert.workingDays.includes(dayName)
                      : false;

                    if (isStylistOff) {
                      return (
                        <div style={{ marginTop: '0.65rem', padding: '0.6rem 0.85rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#d97706', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertCircle size={16} />
                          <span>
                            <strong>Stylist Off-Day Notice:</strong> {selectedExpert?.name || 'This expert'} usually takes {dayName}s off. (Working days: {selectedExpert?.workingDays?.join(', ')}).
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                    <Clock size={16} color="var(--secondary)" /> Select Available Time Slot
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    {availableSlots.map((slot) => {
                      const isSelected = selectedTime === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          className={`slot-chip ${isSelected ? 'selected' : ''}`}
                          onClick={() => { setSelectedTime(slot); setErrorMsg(''); }}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: SUMMARY & NOTES */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  marginBottom: '1.5rem'
                }}>
                  <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', marginBottom: '1rem' }}>
                    Reservation Details
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.925rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Service / Package:</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{selectedService?.name}</span>
                    </div>

                    {/* Verified Specialist Details Box */}
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid var(--border-light)',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      margin: '0.25rem 0'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Specialist:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>
                            {selectedExpert?.name || 'Ifeanyi Chukwu Bethel'}
                          </strong>
                          <VerifiedBadge size="small" text="VERIFIED SELLER" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                        <span style={{ color: 'var(--text-subtle)' }}>Matric No:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{selectedExpert?.matricNo || 'LCU/UG/22/04192'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                        <span style={{ color: 'var(--text-subtle)' }}>Phone:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{selectedExpert?.phone || '+234 916 278 9976'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                        <span style={{ color: 'var(--text-subtle)' }}>Email:</span>
                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{selectedExpert?.email || 'expert@lcu.edu.ng'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                        <span style={{ color: 'var(--text-subtle)' }}>Department:</span>
                        <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>{selectedExpert?.department || 'Cosmetology & Campus Styling'}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Date & Time:</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{selectedDate} at {selectedTime}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Duration & Fee:</span>
                      <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>{selectedService?.duration || 45} mins — ₦{selectedService?.price?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="input-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                    <FileText size={16} color="var(--primary)" /> Specify Your Exact Style / Design Preferences (Optional)
                  </label>
                  <textarea 
                    rows="3"
                    placeholder="e.g. Knotless braids size medium waist-length, French tip acrylic nails, Cat-eye wispy lash set, blonde wig tint..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ border: '1px solid var(--border-strong)', borderRadius: '12px', padding: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                    💡 Your assigned verified specialist will review your exact design request before your session.
                  </span>
                </div>

                {/* PAYMENT METHOD SELECTION */}
                <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Lock size={16} color="var(--primary)" /> Select Payment Method
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <ShieldCheck size={14} /> Escrow Protected
                    </span>
                  </label>

                  {/* Wallet Option */}
                  <div
                    onClick={() => { setPaymentMethod('wallet'); setErrorMsg(''); }}
                    style={{
                      padding: '1rem 1.15rem',
                      borderRadius: '14px',
                      border: '2px solid',
                      borderColor: paymentMethod === 'wallet' ? 'var(--primary)' : 'var(--border-light)',
                      background: paymentMethod === 'wallet' ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)',
                      cursor: 'pointer',
                      marginBottom: '0.75rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: '10px',
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Wallet size={19} />
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.925rem', color: 'var(--text-main)', display: 'block' }}>
                            D.WORLD Student Wallet
                          </strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Instant 1-Click Payment • Funds disbursed instantly
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', display: 'block' }}>Balance</span>
                        <strong style={{
                          fontSize: '0.95rem',
                          color: walletBalance >= (selectedService?.price || 0) ? '#10b981' : '#ef4444'
                        }}>
                          ₦{(walletBalance || 0).toLocaleString()}
                        </strong>
                      </div>
                    </div>

                    {walletBalance < (selectedService?.price || 0) && paymentMethod === 'wallet' && (
                      <div style={{ marginTop: '0.65rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <AlertCircle size={14} />
                        <span>Low wallet balance. Select Paystack below to pay directly with Card / Bank Transfer.</span>
                      </div>
                    )}
                  </div>

                  {/* Paystack Option */}
                  <div
                    onClick={() => { setPaymentMethod('paystack'); setErrorMsg(''); }}
                    style={{
                      padding: '1rem 1.15rem',
                      borderRadius: '14px',
                      border: '2px solid',
                      borderColor: paymentMethod === 'paystack' ? 'var(--primary)' : 'var(--border-light)',
                      background: paymentMethod === 'paystack' ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: '10px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#10b981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <CreditCard size={19} />
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.925rem', color: 'var(--text-main)', display: 'block' }}>
                            Debit Card / Bank Transfer (Paystack)
                          </strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Secure inline checkout with Nigerian debit cards or transfer
                          </span>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#047857',
                        background: '#d1fae5',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px'
                      }}>
                        Instant Verified
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Modal Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
              {step > 1 ? (
                <button type="button" onClick={handlePrevStep} className="btn btn-secondary">
                  <ChevronLeft size={18} /> Back
                </button>
              ) : <div></div>}

              {step < 3 ? (
                <button type="button" onClick={handleNextStep} className="btn btn-primary">
                  Next Step <ChevronRight size={18} />
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={handleConfirmBooking} 
                  disabled={submitting || (paymentMethod === 'wallet' && walletBalance < (selectedService?.price || 0))}
                  className="btn btn-primary"
                  style={{ minWidth: '180px' }}
                >
                  {submitting 
                    ? 'Processing...' 
                    : paymentMethod === 'wallet' 
                      ? `Pay ₦${(selectedService?.price || 0).toLocaleString()} & Confirm`
                      : `Pay via Paystack (₦${(selectedService?.price || 0).toLocaleString()})`
                  }
                </button>
              )}
            </div>
          </>
        ) : (
          /* BOOKING SUCCESS SCREEN */
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', padding: '1.5rem 0' }}
          >
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <CheckCircle2 size={40} />
            </div>

            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontFamily: 'Outfit' }}>
              Booking Confirmed & Paid! 🎉
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '440px', margin: '0 auto 1rem' }}>
              Your appointment for <strong style={{ color: 'var(--text-main)' }}>{selectedService?.name}</strong> on <strong style={{ color: 'var(--primary)' }}>{selectedDate} at {selectedTime}</strong> has been secured!
            </p>

            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '12px',
              padding: '0.85rem 1.25rem',
              maxWidth: '420px',
              margin: '0 auto 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Amount Paid:</span>
              <strong style={{ fontSize: '1.1rem', color: '#10b981', fontFamily: 'Outfit' }}>
                ₦{(selectedService?.price || 0).toLocaleString()}
              </strong>
            </div>

            {/* 1-Click Calendar Add */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
              <a
                href={getGoogleCalendarUrl({
                  date: selectedDate,
                  time: selectedTime,
                  service_id: selectedService,
                  notes
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '0.55rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', textDecoration: 'none' }}
              >
                <CalendarIcon size={16} color="var(--primary)" /> Add to Google Calendar
              </a>
              <button
                type="button"
                onClick={() => downloadIcsFile({
                  date: selectedDate,
                  time: selectedTime,
                  service_id: selectedService,
                  notes
                })}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '0.55rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <Download size={16} color="var(--secondary)" /> Download .ics File
              </button>
            </div>

            <button 
              onClick={onClose} 
              className="btn btn-primary" 
              style={{ width: '100%', justifyContent: 'center' }}
            >
              View In My Dashboard
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default BookingWizardModal;
