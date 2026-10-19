import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  MessageSquare, 
  Send, 
  Image as ImageIcon, 
  Clock, 
  Calendar, 
  Sparkles, 
  ChevronLeft, 
  Search, 
  UserCheck, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { API_URL } from '../config/api';

const QUICK_PROMPTS = [
  "Where is your campus studio located?",
  "Can I come 10 minutes earlier?",
  "I am on my way to your session!",
  "Can I send an inspiration photo for my styling?",
  "Is hair extension or wash included?"
];

const Chat = () => {
  const { user } = useAuth();
  const { notify } = useNotify();
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

  const messagesEndRef = useRef(null);

  // 1. Fetch all conversations on mount & poll while visible
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => {
      if (!document.hidden) fetchConversationsSilently();
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // 2. Select initial or changed conversation
  useEffect(() => {
    if (activeAppointmentId) {
      const match = conversations.find(c => String(c.appointmentId) === String(activeAppointmentId));
      if (match) {
        setActiveConversation(match);
      }
      fetchMessages(activeAppointmentId);
    } else if (conversations.length > 0 && !activeConversation) {
      setActiveAppointmentId(conversations[0].appointmentId);
      setActiveConversation(conversations[0]);
    }
  }, [activeAppointmentId, conversations]);

  // 3. Poll active conversation messages while visible
  useEffect(() => {
    if (!activeAppointmentId) return;
    const interval = setInterval(() => {
      if (!document.hidden) fetchMessagesSilently(activeAppointmentId);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeAppointmentId]);

  // Scroll to bottom on new messages
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

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeAppointmentId) return;

    setSending(true);
    setInputText('');

    try {
      const res = await axios.post(`${API_URL}/appointments/${activeAppointmentId}/messages`, {
        text
      });

      if (res.data.success) {
        setMessages(prev => [...prev, res.data.data]);
        fetchConversationsSilently();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to send message');
      setInputText(text); // restore on failure
    } finally {
      setSending(false);
    }
  };

  const selectConversation = (conv) => {
    setActiveAppointmentId(conv.appointmentId);
    setActiveConversation(conv);
    setSearchParams({ appointmentId: conv.appointmentId });
  };

  const filteredConversations = conversations.filter(c => {
    const q = searchQuery.toLowerCase();
    const otherName = (c.otherParty?.name || '').toLowerCase();
    const serviceName = (c.service?.name || '').toLowerCase();
    const matric = (c.otherParty?.matricNo || '').toLowerCase();
    return otherName.includes(q) || serviceName.includes(q) || matric.includes(q);
  });

  return (
    <div className="page-wrapper container animate-fade-in" style={{ padding: '1.25rem 1rem 3rem', maxWidth: '1160px', margin: '0 auto', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* ── Top Page Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              D.WORLD MESSAGING
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>•</span>
            <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>End-to-End Direct Chat</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', margin: 0, fontFamily: 'Outfit', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Campus Direct Messages
          </h1>
        </div>
      </div>

      {/* ── Split Chat Interface ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 340px) 1fr',
        gap: '1rem',
        flex: 1,
        minHeight: 0,
        background: 'var(--surface)',
        borderRadius: '20px',
        border: '1px solid var(--border-light)',
        overflow: 'hidden'
      }}>
        
        {/* ── LEFT: Conversations List ── */}
        <div style={{
          borderRight: '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          background: 'var(--bg-main)'
        }}>
          {/* Search Bar */}
          <div style={{ padding: '0.85rem', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search chats & specialists..."
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
            </div>
          </div>

          {/* Threads List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {loadingConversations ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Loading conversations...
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((c) => {
                const isSelected = String(c.appointmentId) === String(activeAppointmentId);
                const other = c.otherParty || {};
                const name = other.name || 'Campus Specialist';
                const initial = name.charAt(0).toUpperCase();

                return (
                  <div
                    key={c.appointmentId}
                    onClick={() => selectConversation(c)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '12px',
                      marginBottom: '0.35rem',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                      border: isSelected ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: '12px',
                      background: isSelected 
                        ? 'linear-gradient(135deg, var(--primary), var(--secondary))' 
                        : 'rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '1rem',
                      flexShrink: 0
                    }}>
                      {initial}
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {name}
                        </strong>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
                          {c.date || ''}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '0.75rem', color: isSelected ? 'var(--primary)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.lastMessage ? c.lastMessage.text : `Session: ${c.service?.name || 'Service'}`}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>No chats yet</h4>
                <p style={{ margin: 0, fontSize: '0.78rem' }}>When you book an appointment, your direct chat with your specialist will appear here.</p>
                <Link to="/book" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '1rem', fontSize: '0.78rem', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                  Book Specialist
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Active Chat View ── */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div style={{
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                background: 'var(--surface)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '1rem'
                  }}>
                    {(activeConversation.otherParty?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {activeConversation.otherParty?.name || 'Specialist'}
                      </strong>
                      <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 700 }}>
                        VERIFIED
                      </span>
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                      {activeConversation.service?.name} • 🗓️ {activeConversation.date} at {activeConversation.time}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Link 
                    to={`/dashboard?tab=appointments`}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>View Booking</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>

              {/* Messages Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Security Notice */}
                <div style={{
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.06)',
                  border: '1px solid rgba(99, 102, 241, 0.15)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  marginBottom: '0.5rem'
                }}>
                  🔒 Chatting for <strong>{activeConversation.service?.name}</strong>. Always make payments within D.WORLD for refund protection.
                </div>

                {loadingMessages ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Loading messages...
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
                          maxWidth: '75%',
                          padding: '0.75rem 1rem',
                          borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                          background: isMe ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'var(--bg-main)',
                          color: isMe ? '#ffffff' : 'var(--text-main)',
                          border: isMe ? 'none' : '1px solid var(--border-light)',
                          fontSize: '0.88rem',
                          lineHeight: 1.45,
                          wordBreak: 'break-word',
                          boxShadow: isMe ? '0 4px 12px rgba(99, 102, 241, 0.25)' : 'none'
                        }}>
                          {m.text}
                          {m.photo_url && (
                            <img src={m.photo_url} alt="Reference" style={{ marginTop: '0.5rem', maxWidth: '100%', borderRadius: 8 }} />
                          )}
                        </div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-subtle)', marginTop: '0.2rem', padding: '0 0.35rem' }}>
                          {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sent'}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem' }}>No messages yet.</p>
                    <span style={{ fontSize: '0.78rem' }}>Say hello or ask for studio location below! 👇</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

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
                {QUICK_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(p)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '9999px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--surface)',
                      color: 'var(--text-muted)',
                      fontSize: '0.72rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Chat Input Footer */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                style={{
                  padding: '0.85rem 1.25rem',
                  borderTop: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  background: 'var(--surface)'
                }}
              >
                <input
                  type="text"
                  placeholder="Type a message to your specialist..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.8rem 1.1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={sending || !inputText.trim()}
                  className="btn btn-primary"
                  style={{
                    padding: '0.8rem 1.35rem',
                    borderRadius: '12px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Send size={15} />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              <MessageSquare size={44} style={{ opacity: 0.25, marginBottom: '0.75rem' }} />
              <h3 style={{ margin: '0 0 0.35rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>No Active Conversation Selected</h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Choose a specialist or client from the left panel to begin chatting.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default Chat;
