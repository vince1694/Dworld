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
  AlertCircle
} from 'lucide-react';
import axios from 'axios';

import { useAuth } from '../context/AuthContext';
import VerifiedBadge from './VerifiedBadge';

import { API_URL } from '../config/api';

const DEFAULT_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM', 
  '01:00 PM', '02:30 PM', '04:00 PM', '05:30 PM'
];

const BookingWizardModal = ({ isOpen, onClose, onBookingSuccess, preselectedServiceId }) => {
  const { user } = useAuth();
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
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [bookingComplete, setBookingComplete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchServices();
      fetchVerifiedExperts();
      setStep(1);
      setBookingComplete(false);
      setErrorMsg('');
      if (!selectedDate) {
        setSelectedDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen]);

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
      const res = await axios.get(`${API_URL}/appointments/slots?date=${dateStr}`);
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

    if (!selectedService || !selectedDate || !selectedTime) {
      setErrorMsg('Missing required booking parameters.');
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
        notes
      };

      const res = await axios.post(`${API_URL}/appointments/book`, payload);
      if (res.data.success) {
        setBookingComplete(true);
        if (onBookingSuccess) {
          onBookingSuccess(res.data.data || res.data);
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Booking failed. Please check date/time availability.');
    } finally {
      setSubmitting(false);
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

                {/* Tier Switcher Pills */}
                <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', marginBottom: '1rem', paddingBottom: '0.25rem' }}>
                  {[
                    { id: 'all', label: 'All Offers' },
                    { id: 'single', label: '🟢 Single' },
                    { id: 'double', label: '🔵 Double' },
                    { id: 'triple', label: '🟣 Triple' },
                    { id: 'premium', label: '👑 Premium' }
                  ].map(tier => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setWizardTier(tier.id)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '9999px',
                        border: '1px solid var(--border-light)',
                        background: wizardTier === tier.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                        color: wizardTier === tier.id ? 'white' : 'var(--text-muted)',
                        fontSize: '0.775rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>

                {loadingServices ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading services & AI verified sellers...
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                    {services
                      .filter(s => wizardTier === 'all' || s.type === wizardTier || (wizardTier === 'premium' && s.type === 'package'))
                      .map((service) => {
                        const serviceId = String(service._id || service.id);
                        const selectedId = selectedService ? String(selectedService._id || selectedService.id) : null;
                        const isSelected = selectedId === serviceId;

                        return (
                          <div
                            key={serviceId}
                            onClick={() => { 
                              setSelectedService(service); 
                              setErrorMsg('');
                              // AI Match expert connected to this service
                              if (expertsList && expertsList.length > 0) {
                                const matched = expertsList.find(exp => String(exp._id) === String(service.stylist_id)) || expertsList[0];
                                setSelectedExpert(matched);
                              }
                            }}
                            className="hover-card-select"
                            style={{
                              padding: '1.15rem',
                              borderRadius: '14px',
                              background: isSelected ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                              border: isSelected ? '2px solid var(--secondary)' : '1px solid var(--border-light)',
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
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isSelected ? 'var(--secondary)' : 'var(--text-main)', fontFamily: 'Outfit' }}>
                                  {service.name}
                                </span>
                                {isSelected && (
                                  <span style={{ background: 'var(--secondary)', color: '#070b16', borderRadius: '50%', padding: '0.15rem', display: 'flex' }}>
                                    <Check size={14} />
                                  </span>
                                )}
                              </div>
                              <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.85rem', lineHeight: 1.35 }}>
                                {service.description || 'Verified specialist beauty offering.'}
                              </p>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem', fontWeight: 600 }}>
                              <span style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                ₦{service.price?.toLocaleString()}
                              </span>
                              <span style={{ color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <Clock size={13} /> {service.duration || '45'} mins
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
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{selectedExpert?.phone || '+234 803 555 0199'}</span>
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
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ minWidth: '160px' }}
                >
                  {submitting ? 'Confirming...' : 'Confirm Booking'}
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
              Appointment Reserved!
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '420px', margin: '0 auto 2rem' }}>
              Your appointment for <strong style={{ color: 'var(--text-main)' }}>{selectedService?.name}</strong> on <strong style={{ color: 'var(--primary)' }}>{selectedDate} at {selectedTime}</strong> has been successfully requested.
            </p>

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
