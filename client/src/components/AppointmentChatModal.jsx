import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Send, 
  Image as ImageIcon, 
  MessageSquare, 
  ExternalLink, 
  ShieldCheck, 
  CheckCheck, 
  Sparkles,
  Maximize2
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';

const QUICK_CAMPUS_PROMPTS = [
  "📍 Where is your campus studio located?",
  "🏃 On my way right now!",
  "📸 Can I send an inspo picture?"
];

const AppointmentChatModal = ({ isOpen, onClose, appointment, currentUser: propUser }) => {
  const { user: authUser } = useAuth();
  const user = propUser || authUser;
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const aptId = appointment?._id || appointment?.id;

  useEffect(() => {
    if (isOpen && aptId) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen, aptId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL}/appointments/${aptId}/messages`);
      if (res.data.success) {
        setMessages(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load appointment messages', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('Photo must be less than 4MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (textToSend) => {
    const text = (typeof textToSend === 'string' ? textToSend : inputText).trim();
    if ((!text && !selectedPhoto) || sending || !aptId) return;

    setSending(true);
    if (typeof textToSend !== 'string') setInputText('');
    const photoToSend = selectedPhoto;
    setSelectedPhoto(null);

    try {
      const res = await axios.post(`${API_URL}/appointments/${aptId}/messages`, {
        text,
        photo_url: photoToSend || ''
      });

      if (res.data.success) {
        setMessages(prev => [...prev, res.data.data]);
      }
    } catch (err) {
      console.error('Failed to send message', err);
      if (typeof textToSend !== 'string') setInputText(text);
      if (photoToSend) setSelectedPhoto(photoToSend);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !appointment) return null;

  const isClient = user?.role !== 'expert' && user?.role !== 'stylist' && user?.role !== 'admin';
  const partnerName = isClient
    ? (appointment.stylist_id?.name || 'Campus Specialist')
    : (appointment.user_id?.name || 'Client');

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(10, 15, 30, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--surface, #ffffff)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '540px',
            height: '640px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border-light)',
            overflow: 'hidden'
          }}
        >
          {/* ── CHAT PANEL HEADER ── */}
          <div style={{
            padding: '1rem 1.25rem',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                fontWeight: 800,
                color: '#fff',
                flexShrink: 0
              }}>
                💬
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {partnerName}
                  </h3>
                  <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.25)', color: '#ffffff', fontWeight: 700 }}>
                    VERIFIED
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {appointment.service_id?.name || 'Service'} • {appointment.date}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
              {/* Expand to Full Page */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/chat?appointmentId=${aptId}`);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.4rem 0.6rem',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.72rem',
                  fontWeight: 600
                }}
                title="Expand to Full Campus Direct Messages"
              >
                <span>Full Page</span>
                <ExternalLink size={12} />
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* ── SECURITY ESCROW NOTIFICATION ── */}
          <div style={{
            padding: '0.5rem 1rem',
            background: 'rgba(99, 102, 241, 0.05)',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.74rem',
            color: 'var(--text-muted)'
          }}>
            <ShieldCheck size={15} color="var(--primary)" />
            <span>Encrypted direct messaging. Booking funds are securely escrow protected.</span>
          </div>

          {/* ── MESSAGES CANVAS ── */}
          <div style={{
            flex: 1,
            padding: '1rem',
            overflowY: 'auto',
            background: 'var(--bg-main)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            {loading ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <div style={{ width: 24, height: 24, border: '2px solid rgba(99,102,241,0.2)', borderTop: '2px solid #6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 0.5rem' }} />
                <span>Loading messages...</span>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', maxWidth: '320px', padding: '1rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                  <Sparkles size={20} color="var(--primary)" />
                </div>
                <h4 style={{ margin: '0 0 0.25rem', color: 'var(--text-main)', fontSize: '0.95rem' }}>No messages yet</h4>
                <p style={{ fontSize: '0.8rem', margin: 0, lineHeight: 1.45 }}>
                  Ask questions, send hair or nail inspiration photos, or confirm room directions!
                </p>
              </div>
            ) : (
              messages.map(msg => {
                const isMe = String(msg.sender_id?._id || msg.sender_id) === String(user?.id || user?._id);
                return (
                  <div
                    key={msg._id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '80%',
                        padding: '0.65rem 0.95rem',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isMe ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'var(--surface)',
                        color: isMe ? '#ffffff' : 'var(--text-main)',
                        boxShadow: isMe ? '0 4px 12px rgba(99, 102, 241, 0.2)' : '0 2px 4px rgba(0,0,0,0.04)',
                        border: isMe ? 'none' : '1px solid var(--border-light)',
                        fontSize: '0.88rem',
                        lineHeight: 1.45,
                        wordBreak: 'break-word'
                      }}
                    >
                      {msg.photo_url && (
                        <div style={{ marginBottom: msg.text ? '0.45rem' : 0 }}>
                          <img 
                            src={msg.photo_url} 
                            alt="Reference" 
                            style={{ 
                              maxWidth: '100%', 
                              borderRadius: '10px', 
                              maxHeight: '200px', 
                              objectFit: 'cover',
                              display: 'block' 
                            }} 
                          />
                        </div>
                      )}
                      {msg.text && <div>{msg.text}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem', padding: '0 0.35rem' }}>
                      <span style={{ fontSize: '0.63rem', color: 'var(--text-subtle)' }}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sent'}
                      </span>
                      {isMe && <CheckCheck size={11} color="#818cf8" />}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── PHOTO PREVIEW (IF ATTACHED) ── */}
          {selectedPhoto && (
            <div style={{
              padding: '0.5rem 1rem',
              background: 'var(--surface)',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <img src={selectedPhoto} alt="Attachment" style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '8px' }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 600 }}>Photo attached</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
              >
                Remove
              </button>
            </div>
          )}

          {/* ── QUICK CAMPUS PROMPTS ── */}
          <div style={{
            padding: '0.35rem 0.75rem',
            background: 'var(--surface)',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            gap: '0.35rem',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            {QUICK_CAMPUS_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(p)}
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-muted)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* ── CHAT INPUT FORM ── */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--surface)',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
              title="Attach photo"
            >
              <ImageIcon size={18} color="var(--primary)" />
            </button>

            <input
              type="text"
              placeholder="Ask a question or send notes..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{
                flex: 1,
                padding: '0.65rem 0.95rem',
                borderRadius: '12px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-main)',
                color: 'var(--text-main)',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />

            <button
              type="submit"
              disabled={sending || (!inputText.trim() && !selectedPhoto)}
              className="btn btn-primary"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                opacity: sending || (!inputText.trim() && !selectedPhoto) ? 0.5 : 1
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AppointmentChatModal;
