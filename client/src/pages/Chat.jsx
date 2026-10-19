import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  MessageSquare, 
  Send, 
  Image as ImageIcon, 
  Clock, 
  Calendar, 
  Sparkles, 
  ArrowLeft, 
  Search, 
  UserCheck, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCheck,
  Check,
  Phone,
  Paperclip,
  Smile,
  X,
  Compass,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { API_URL } from '../config/api';

const QUICK_CAMPUS_PROMPTS = [
  "📍 Where is your campus studio located?",
  "🏃 On my way right now!",
  "⏱️ Can I arrive 10 minutes early?",
  "📸 Can I send an inspiration photo?",
  "💇‍♀️ Are extensions or hair wash included?",
  "✨ Just arrived outside your door!"
];

const POPULAR_EMOJIS = ['😊', '👍', '❤️', '🔥', '✨', '💅', '💇‍♀️', '📍', '🙌', '💯', '🙏', '⏰'];

const Chat = () => {
  const { user } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [activeAppointmentId, setActiveAppointmentId] = useState(searchParams.get('appointmentId') || null);
  const [activeConversation, setActiveConversation] = useState(null);

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'active', 'completed'
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Mobile navigation toggle (true = viewing conversation thread on small screen)
  const [mobileViewingThread, setMobileViewingThread] = useState(Boolean(searchParams.get('appointmentId')));

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // 1. Fetch conversations on mount & poll
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => {
      if (!document.hidden) fetchConversationsSilently();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // 2. Sync active conversation
  useEffect(() => {
    if (activeAppointmentId) {
      const match = conversations.find(c => String(c.appointmentId) === String(activeAppointmentId));
      if (match) {
        setActiveConversation(match);
      }
      fetchMessages(activeAppointmentId);
    } else if (conversations.length > 0 && !activeConversation && window.innerWidth >= 768) {
      // Auto-select first on desktop only
      setActiveAppointmentId(conversations[0].appointmentId);
      setActiveConversation(conversations[0]);
    }
  }, [activeAppointmentId, conversations]);

  // 3. Poll active thread messages
  useEffect(() => {
    if (!activeAppointmentId) return;
    const interval = setInterval(() => {
      if (!document.hidden) fetchMessagesSilently(activeAppointmentId);
    }, 3500);
    return () => clearInterval(interval);
  }, [activeAppointmentId]);

  // Scroll to bottom on message change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoadingConversations(true);
      const res = await axios.get(`${API_URL}/appointments/conversations`);
      if (res.data.success) {
        setConversations(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const fetchConversationsSilently = async () => {
    try {
      const res = await axios.get(`${API_URL}/appointments/conversations`);
      if (res.data.success) {
        setConversations(res.data.data || []);
      }
    } catch (err) {}
  };

  const fetchMessages = async (aptId) => {
    try {
      setLoadingMessages(true);
      const res = await axios.get(`${API_URL}/appointments/${aptId}/messages`);
      if (res.data.success) {
        setMessages(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchMessagesSilently = async (aptId) => {
    try {
      const res = await axios.get(`${API_URL}/appointments/${aptId}/messages`);
      if (res.data.success) {
        setMessages(res.data.data || []);
      }
    } catch (err) {}
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      notify.error('Photo must be less than 4MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (customText) => {
    const text = (customText !== undefined ? customText : inputText).trim();
    if ((!text && !selectedPhoto) || !activeAppointmentId || sending) return;

    setSending(true);
    if (customText === undefined) setInputText('');
    const photoToSend = selectedPhoto;
    setSelectedPhoto(null);
    setShowEmojiPicker(false);

    try {
      const res = await axios.post(`${API_URL}/appointments/${activeAppointmentId}/messages`, {
        text,
        photo_url: photoToSend || ''
      });

      if (res.data.success) {
        setMessages(prev => [...prev, res.data.data]);
        fetchConversationsSilently();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to send message');
      if (customText === undefined) setInputText(text);
      if (photoToSend) setSelectedPhoto(photoToSend);
    } finally {
      setSending(false);
    }
  };

  const selectConversation = (conv) => {
    setActiveAppointmentId(conv.appointmentId);
    setActiveConversation(conv);
    setSearchParams({ appointmentId: conv.appointmentId });
    setMobileViewingThread(true);
  };

  const handleBackToList = () => {
    setMobileViewingThread(false);
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      // Tab filter
      if (filterTab === 'active' && (c.status === 'completed' || c.status === 'cancelled')) return false;
      if (filterTab === 'completed' && c.status !== 'completed') return false;

      // Query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const otherName = (c.otherParty?.name || '').toLowerCase();
      const serviceName = (c.service?.name || '').toLowerCase();
      const matric = (c.otherParty?.matricNo || '').toLowerCase();
      const lastText = (c.lastMessage?.text || '').toLowerCase();
      return otherName.includes(q) || serviceName.includes(q) || matric.includes(q) || lastText.includes(q);
    });
  }, [conversations, filterTab, searchQuery]);

  return (
    <div className="page-wrapper container animate-fade-in" style={{ padding: '1rem 0.75rem 2rem', maxWidth: '1240px', margin: '0 auto', height: 'calc(100vh - 75px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* ── TOP HEADER BAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexShrink: 0, padding: '0 0.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              CAMPUS DIRECT MESSAGING
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
              Active Campus Network
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.7rem)', margin: 0, fontFamily: 'Outfit', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Direct Student & Specialist Messages
          </h1>
        </div>

        {/* Global Action Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link
            to="/dashboard?tab=appointments"
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Calendar size={14} color="var(--primary)" />
            <span className="hidden-mobile">My Appointments</span>
          </Link>
        </div>
      </div>

      {/* ── SPLIT / UNIFIED CHAT CONTAINER ── */}
      <div style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        background: 'var(--surface)',
        borderRadius: '20px',
        border: '1px solid var(--border-light)',
        overflow: 'hidden',
        boxShadow: '0 12px 36px -8px rgba(0,0,0,0.08)',
        position: 'relative'
      }}>

        {/* ── LEFT PANEL: CONVERSATIONS LIST ── */}
        <div 
          className={`chat-sidebar-panel ${mobileViewingThread ? 'hidden-on-mobile' : ''}`}
          style={{
            width: '340px',
            borderRight: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            background: 'var(--bg-main)',
            flexShrink: 0
          }}
        >
          {/* Search & Filter Header */}
          <div style={{ padding: '0.85rem', borderBottom: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search specialists, services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--surface)',
                  color: 'var(--text-main)',
                  fontSize: '0.825rem',
                  outline: 'none'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {[
                { id: 'all', label: 'All Chats' },
                { id: 'active', label: 'Active' },
                { id: 'completed', label: 'Completed' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: '0.35rem 0.4rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: filterTab === tab.id ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
                    color: filterTab === tab.id ? '#ffffff' : 'var(--text-muted)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Thread Items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {loadingConversations ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <div style={{ width: 28, height: 28, border: '2px solid rgba(99,102,241,0.2)', borderTop: '2px solid #6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 0.75rem' }} />
                <span>Loading conversations...</span>
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((c) => {
                const isSelected = String(c.appointmentId) === String(activeAppointmentId);
                const other = c.otherParty || {};
                const name = other.name || 'Campus Specialist';
                const initial = name.charAt(0).toUpperCase();
                const isStylist = other.role === 'expert' || other.role === 'stylist';

                return (
                  <div
                    key={c.appointmentId}
                    onClick={() => selectConversation(c)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '14px',
                      marginBottom: '0.4rem',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                      border: isSelected ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      position: 'relative'
                    }}
                  >
                    {/* Avatar with Online/Role Badge */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: '14px',
                        background: isSelected 
                          ? 'linear-gradient(135deg, var(--primary), var(--secondary))' 
                          : 'rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '1.05rem',
                        overflow: 'hidden'
                      }}>
                        {other.avatar ? (
                          <img src={other.avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          initial
                        )}
                      </div>
                      <span style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: '#10b981',
                        border: '2px solid var(--bg-main)'
                      }} />
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden' }}>
                          <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {name}
                          </strong>
                          {isStylist && (
                            <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', fontWeight: 700 }}>
                              PRO
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', flexShrink: 0 }}>
                          {c.date || ''}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.74rem', color: isSelected ? 'var(--primary)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.lastMessage ? (
                            c.lastMessage.photo_url ? '📷 [Photo attachment]' : c.lastMessage.text
                          ) : (
                            `Service: ${c.service?.name || 'Styling'}`
                          )}
                        </span>
                        {c.status && (
                          <span style={{
                            fontSize: '0.6rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: c.status === 'completed' ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)',
                            color: c.status === 'completed' ? '#818cf8' : '#34d399'
                          }}>
                            {c.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <MessageSquare size={36} style={{ opacity: 0.25, margin: '0 auto 0.75rem' }} />
                <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>No conversations yet</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.45 }}>Direct chats are created automatically when you book an appointment with any campus specialist.</p>
                <Link to="/services" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '1.25rem', fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                  <Compass size={14} /> Browse Campus Services
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: ACTIVE CHAT THREAD ── */}
        <div 
          className={`chat-main-panel ${!mobileViewingThread ? 'hidden-on-mobile' : ''}`}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            background: 'var(--surface)'
          }}
        >
          {activeConversation ? (
            <>
              {/* Active Chat Header */}
              <div style={{
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                background: 'var(--surface)',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="mobile-back-btn"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      padding: '0.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px'
                    }}
                    title="Back to conversations"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  {/* Partner Avatar */}
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: '13px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {activeConversation.otherParty?.avatar ? (
                      <img src={activeConversation.otherParty.avatar} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (activeConversation.otherParty?.name || 'U').charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Partner Info */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <strong style={{ fontSize: '0.98rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {activeConversation.otherParty?.name || 'Campus Specialist'}
                      </strong>
                      <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 700 }}>
                        VERIFIED
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {activeConversation.service?.name} • 🗓️ {activeConversation.date} at {activeConversation.time}
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                  {activeConversation.otherParty?.phone && (
                    <a
                      href={`tel:${activeConversation.otherParty.phone}`}
                      className="btn btn-secondary"
                      style={{ padding: '0.45rem 0.65rem', borderRadius: '8px', fontSize: '0.75rem', textDecoration: 'none' }}
                      title="Call Specialist"
                    >
                      <Phone size={14} color="var(--primary)" />
                    </a>
                  )}

                  {/* JUMP TO THE NEW STANDALONE APPOINTMENT PAGE */}
                  <Link 
                    to={`/appointment/${activeConversation.appointmentId}`}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: 'var(--text-main)'
                    }}
                  >
                    <span>View Booking</span>
                    <ExternalLink size={13} color="var(--primary)" />
                  </Link>
                </div>
              </div>

              {/* Pinned Escrow Banner */}
              <div style={{
                padding: '0.55rem 1rem',
                background: 'rgba(99, 102, 241, 0.05)',
                borderBottom: '1px solid rgba(99, 102, 241, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'var(--text-muted)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <ShieldCheck size={16} color="var(--primary)" />
                  <span>
                    Direct messaging for <strong>{activeConversation.service?.name}</strong>. Payment is protected in D.WORLD escrow.
                  </span>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>
                  ₦{(activeConversation.service?.price || 0).toLocaleString()}
                </span>
              </div>

              {/* Messages Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {loadingMessages ? (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <div style={{ width: 24, height: 24, border: '2px solid rgba(99,102,241,0.2)', borderTop: '2px solid #6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 0.5rem' }} />
                    <span>Loading conversation history...</span>
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((m, idx) => {
                    const isMe = String(m.sender_id?._id || m.sender_id) === String(user?.id || user?._id);
                    return (
                      <div
                        key={m._id || idx}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMe ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div style={{
                          maxWidth: '78%',
                          padding: '0.7rem 0.95rem',
                          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          background: isMe ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'var(--bg-main)',
                          color: isMe ? '#ffffff' : 'var(--text-main)',
                          border: isMe ? 'none' : '1px solid var(--border-light)',
                          fontSize: '0.88rem',
                          lineHeight: 1.45,
                          wordBreak: 'break-word',
                          boxShadow: isMe ? '0 4px 14px rgba(99, 102, 241, 0.25)' : 'none'
                        }}>
                          {m.text && <div>{m.text}</div>}
                          {m.photo_url && (
                            <div 
                              onClick={() => setLightboxImage(m.photo_url)}
                              style={{ marginTop: m.text ? '0.5rem' : 0, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
                            >
                              <img src={m.photo_url} alt="Attachment" style={{ maxWidth: '100%', maxHeight: '280px', display: 'block', borderRadius: 10 }} />
                              <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.6)', padding: '0.2rem 0.4rem', borderRadius: 4, color: '#fff', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <Maximize2 size={10} /> View
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem', padding: '0 0.35rem' }}>
                          <span style={{ fontSize: '0.64rem', color: 'var(--text-subtle)' }}>
                            {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sent'}
                          </span>
                          {isMe && <CheckCheck size={12} color="#818cf8" />}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                      <Sparkles size={22} color="var(--primary)" />
                    </div>
                    <h4 style={{ margin: '0 0 0.25rem', color: 'var(--text-main)', fontSize: '0.95rem', fontFamily: 'Outfit' }}>Direct Chat Started</h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', maxWidth: '380px', marginInline: 'auto' }}>
                      Say hello or use the quick chips below to ask for location, timings, or inspiration.
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Photo Preview Before Send */}
              {selectedPhoto && (
                <div style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--bg-main)',
                  borderTop: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{ position: 'relative', width: 50, height: 50, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                    <img src={selectedPhoto} alt="Upload Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => setSelectedPhoto(null)}
                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: 18, height: 18, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Photo attached • ready to send</span>
                </div>
              )}

              {/* Quick Prompts Bar */}
              <div style={{
                padding: '0.45rem 1rem',
                borderTop: '1px solid var(--border-light)',
                background: 'var(--bg-main)',
                display: 'flex',
                gap: '0.4rem',
                overflowX: 'auto',
                whiteSpace: 'nowrap'
              }}>
                {QUICK_CAMPUS_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(p)}
                    style={{
                      padding: '0.3rem 0.7rem',
                      borderRadius: '9999px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--surface)',
                      color: 'var(--text-muted)',
                      fontSize: '0.73rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Emoji Picker Tray */}
              {showEmojiPicker && (
                <div style={{
                  padding: '0.5rem 1rem',
                  borderTop: '1px solid var(--border-light)',
                  background: 'var(--surface)',
                  display: 'flex',
                  gap: '0.5rem',
                  overflowX: 'auto'
                }}>
                  {POPULAR_EMOJIS.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInputText(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.25rem',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        borderRadius: 6
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Input Footer Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderTop: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  background: 'var(--surface)'
                }}
              >
                {/* Photo Upload Hidden Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary"
                  style={{ padding: '0.65rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Attach inspiration photo"
                >
                  <ImageIcon size={18} color="var(--primary)" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="btn btn-secondary"
                  style={{ padding: '0.65rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Insert emoji"
                >
                  <Smile size={18} color="var(--text-muted)" />
                </button>

                <input
                  type="text"
                  placeholder="Type a message to your specialist (Press Enter to send)..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
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
                    padding: '0.75rem 1.25rem',
                    borderRadius: '12px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    opacity: (sending || (!inputText.trim() && !selectedPhoto)) ? 0.6 : 1
                  }}
                >
                  <Send size={15} />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '20px', background: 'rgba(99, 102, 241, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <MessageSquare size={32} color="var(--primary)" />
              </div>
              <h3 style={{ margin: '0 0 0.4rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>No Active Conversation Selected</h3>
              <p style={{ margin: 0, fontSize: '0.88rem', maxWidth: '340px' }}>
                Choose any specialist or client from the left directory to inspect chat history or ask questions.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* ── IMAGE LIGHTBOX MODAL ── */}
      <AnimatePresence>
        {lightboxImage && (
          <div
            className="modal-overlay"
            onClick={() => setLightboxImage(null)}
            style={{ zIndex: 10000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                style={{
                  position: 'absolute',
                  top: -40,
                  right: 0,
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
              <img src={lightboxImage} alt="Full view" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain' }} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .chat-sidebar-panel.hidden-on-mobile {
            display: none !important;
          }
          .chat-main-panel.hidden-on-mobile {
            display: none !important;
          }
          .chat-sidebar-panel {
            width: 100% !important;
            border-right: none !important;
          }
          .hidden-mobile {
            display: none !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-back-btn {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
};

export default Chat;
