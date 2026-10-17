import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, CheckCircle, MessageSquare, Camera, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';

import { API_URL } from '../config/api';

const ReviewModal = ({ isOpen, onClose, appointment, onReviewSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !appointment) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        setPhotoUrl(compressedBase64);
      };
      img.src = uploadEvent.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSubmitting(true);
      const res = await axios.post(`${API_URL}/reviews`, {
        appointment_id: appointment.id || appointment._id,
        rating,
        comment,
        photo_url: photoUrl
      });
      if (res.data.success) {
        if (onReviewSubmitted) onReviewSubmitted(res.data.message);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className="modal-card"
        style={{ padding: '2rem', maxWidth: '520px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Star size={22} fill="#d97706" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'Outfit' }}>Rate & Review Expert</h3>
              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                {appointment.service_id?.name || 'Completed Service'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Star Picker */}
          <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Tap stars to select rating
            </label>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transform: (hoverRating >= star || rating >= star) ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <Star 
                    size={36} 
                    color={(hoverRating >= star || rating >= star) ? '#f59e0b' : '#cbd5e1'} 
                    fill={(hoverRating >= star || rating >= star) ? '#f59e0b' : 'none'} 
                  />
                </button>
              ))}
            </div>
            <strong style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-main)', fontSize: '1rem', fontFamily: 'Outfit' }}>
              {rating === 5 && '⭐⭐⭐⭐⭐ Exceptional Service!'}
              {rating === 4 && '⭐⭐⭐⭐ Great Experience'}
              {rating === 3 && '⭐⭐⭐ Average Service'}
              {rating === 2 && '⭐⭐ Below Expectations'}
              {rating === 1 && '⭐ Poor Experience'}
            </strong>
          </div>

          {/* Feedback Textarea */}
          <div className="input-group">
            <label htmlFor="comment">Your Feedback & Experience (Optional)</label>
            <textarea
              id="comment"
              rows="3"
              placeholder="Tell other clients about your experience with this expert..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {/* Photo Upload Section */}
          <div style={{ margin: '1.25rem 0' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              📸 Attach Photo of Finished Look (Optional)
            </label>
            {photoUrl ? (
              <div style={{ position: 'relative', display: 'inline-block', borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--primary)' }}>
                <img src={photoUrl} alt="Review look" style={{ width: '120px', height: '120px', objectFit: 'cover', display: 'block' }} />
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    background: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '1rem',
                border: '2px dashed var(--border-color)',
                borderRadius: '12px',
                cursor: 'pointer',
                background: 'var(--surface-color)',
                color: 'var(--text-muted)',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}>
                <Camera size={20} color="var(--primary)" />
                <span>Upload a photo of your hair, nails, or style</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Submitting...' : 'Submit Verified Review'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ReviewModal;
