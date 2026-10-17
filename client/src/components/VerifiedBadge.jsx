import React from 'react';
import { ShieldCheck, Check } from 'lucide-react';

const VerifiedBadge = ({ text = "VERIFIED SELLER", size = "normal" }) => {
  const isSmall = size === "small";

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: isSmall ? '0.3rem' : '0.45rem',
      padding: isSmall ? '0.2rem 0.6rem' : '0.35rem 0.85rem',
      background: 'linear-gradient(135deg, #059669, #10b981)',
      color: '#ffffff',
      borderRadius: '9999px',
      fontSize: isSmall ? '0.7rem' : '0.775rem',
      fontWeight: 800,
      letterSpacing: '0.04em',
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      fontFamily: 'Outfit, sans-serif',
      whiteSpace: 'nowrap',
      userSelect: 'none'
    }}>
      <div style={{
        width: isSmall ? '14px' : '16px',
        height: isSmall ? '14px' : '16px',
        borderRadius: '50%',
        background: '#ffffff',
        color: '#059669',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900
      }}>
        <Check size={isSmall ? 10 : 12} strokeWidth={3.5} />
      </div>
      <span>{text}</span>
      <ShieldCheck size={isSmall ? 12 : 14} style={{ opacity: 0.85 }} />
    </div>
  );
};

export default VerifiedBadge;
