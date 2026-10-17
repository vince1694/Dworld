import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Image, MessageSquare, Clock, UserCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config/api';

const AppointmentChatModal = ({ isOpen, onClose, appointment, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && appointment?._id) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 6000);
      return () => clearInterval(interval);
    }
  }, [isOpen, appointment?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL}/appointments/${appointment._id}/messages`);
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

    if (file.size > 3 * 1024 * 1024) {
      alert('Photo must be less than 3MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedPhoto) || sending) return;

    setSending(true);
    try {
      const res = await axios.post(`${API_URL}/appointments/${appointment._id}/messages`, {
        text: inputText.trim(),
        photo_url: selectedPhoto || ''
      });

      if (res.data.success) {
        setMessages(prev => [...prev, res.data.data]);
        setInputText('');
        setSelectedPhoto(null);
      }
    } catch (err) {
      console.error('Failed to send message', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !appointment) return null;

  const isClient = currentUser?.role !== 'expert' && currentUser?.role !== 'stylist' && currentUser?.role !== 'admin';
  const partnerName = isClient
    ? (appointment.stylist_id?.name || 'Stylist')
    : (appointment.user_id?.name || 'Client');

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '520px',
            height: '620px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-light)',
            overflow: 'hidden'
          }}
        >
          {/* CHAT HEADER */}
          <div style={{
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem'
              }}>
                💬
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                  Chat with {partnerName}
                </h3>
                <span style={{ fontSize: '0.78rem', opacity: 0.9 }}>
                  {appointment.service_id?.name || 'Service'} • {appointment.date}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
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
              <X size={18} />
            </button>
          </div>

          {/* CHAT MESSAGES BODY */}
          <div style={{
            flex: 1,
            padding: '1.25rem',
            overflowY: 'auto',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            {loading ? (
              <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Loading conversation...
              </div>
            ) : messages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', maxWidth: '300px' }}>
                <p style={{ fontSize: '1.5rem', margin: '0 0 0.5rem' }}>👋</p>
                <p style={{ fontWeight: 600, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>No messages yet</p>
                <p style={{ fontSize: '0.8rem', margin: 0 }}>
                  Ask questions, send hair/nail inspiration photos, or confirm campus room directions!
                </p>
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.sender_id?._id === currentUser?.id || msg.sender_id === currentUser?.id;
                return (
                  <div
                    key={msg._id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', padding: '0 0.5rem' }}>
                      {msg.sender_id?.name || 'User'}
                    </span>
                    <div
                      style={{
                        maxWidth: '75%',
                        padding: '0.75rem 1rem',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isMe ? 'var(--primary)' : '#ffffff',
                        color: isMe ? '#ffffff' : 'var(--text-main)',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                        border: isMe ? 'none' : '1px solid var(--border-light)',
                        fontSize: '0.9rem',
                        lineHeight: 1.4
                      }}
                    >
                      {msg.photo_url && (
                        <div style={{ marginBottom: msg.text ? '0.5rem' : 0 }}>
                          <img 
                            src={msg.photo_url} 
                            alt="Reference" 
                            style={{ 
                              maxWidth: '100%', 
                              borderRadius: '10px', 
                              maxHeight: '180px', 
                              objectFit: 'cover',
                              display: 'block' 
                            }} 
                          />
                        </div>
                      )}
                      {msg.text && <div>{msg.text}</div>}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-subtle)', marginTop: '0.2rem', padding: '0 0.5rem' }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* PHOTO PREVIEW (IF ATTACHED) */}
          {selectedPhoto && (
            <div style={{
              padding: '0.5rem 1rem',
              background: '#f1f5f9',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <img src={selectedPhoto} alt="Attachment" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>Reference Photo Attached</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
              >
                Remove
              </button>
            </div>
          )}

          {/* CHAT INPUT FORM */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: '0.85rem 1rem',
              background: '#ffffff',
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
              style={{
                background: 'rgba(79, 70, 229, 0.1)',
                color: 'var(--primary)',
                border: 'none',
                borderRadius: '12px',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Attach inspiration photo"
            >
              <Image size={20} />
            </button>

            <input
              type="text"
              placeholder="Ask a question or send hairstyle notes..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{
                flex: 1,
                padding: '0.65rem 1rem',
                borderRadius: '9999px',
                border: '1px solid var(--border-light)',
                background: '#f8fafc',
                fontSize: '0.875rem'
              }}
            />

            <button
              type="submit"
              disabled={sending || (!inputText.trim() && !selectedPhoto)}
              style={{
                background: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: sending || (!inputText.trim() && !selectedPhoto) ? 'not-allowed' : 'pointer',
                opacity: sending || (!inputText.trim() && !selectedPhoto) ? 0.5 : 1,
                transition: 'all 0.15s ease'
              }}
            >
              <Send size={18} />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AppointmentChatModal;
