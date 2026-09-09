import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X, ShieldCheck, AlertCircle, Clock, Coins } from 'lucide-react';

interface ClearLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  settledCount: number;
  activeCount: number;
  unclaimedCount: number;
}

export const ClearLedgerModal: React.FC<ClearLedgerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  settledCount,
  activeCount,
  unclaimedCount,
}) => {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.18s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          animation: 'scaleUp 0.18s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={18} />
            </div>
            <div>
              <h3 className="font-bobz" style={{ margin: 0, fontSize: '1.15rem', color: '#111827' }}>
                Clear Settled History
              </h3>
              <p
                className="font-terminal"
                style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: '#6B7280' }}
              >
                Remove resolved records from view
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
              padding: '0.4rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
              e.currentTarget.style.color = '#111827';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#9CA3AF';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          <p
            className="font-subtext"
            style={{
              margin: '0 0 1.25rem 0',
              fontSize: '0.86rem',
              lineHeight: 1.5,
              color: '#374151',
            }}
          >
            This action will clear{' '}
            <strong style={{ color: '#111827' }}>
              {settledCount} resolved record{settledCount === 1 ? '' : 's'}
            </strong>{' '}
            (cashed-out, claimed, and lost trades) from your activity ledger.
          </p>

          {/* Breakdown cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
            {/* Active Running Bets — Strictly Protected */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(14, 165, 233, 0.08)',
                border: '1px solid rgba(14, 165, 233, 0.2)',
                borderRadius: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <Clock size={16} style={{ color: '#0284C7' }} />
                <span className="font-bobz" style={{ fontSize: '0.82rem', color: '#0369A1' }}>
                  Active Running Bets
                </span>
              </div>
              <span
                className="font-terminal"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#0284C7',
                  backgroundColor: '#FFFFFF',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '16px',
                  border: '1px solid rgba(14, 165, 233, 0.25)',
                }}
              >
                {activeCount} Kept Safe
              </span>
            </div>

            {/* Unclaimed Payouts — Protected */}
            {unclaimedCount > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <Coins size={16} style={{ color: '#059669' }} />
                  <span className="font-bobz" style={{ fontSize: '0.82rem', color: '#047857' }}>
                    Unclaimed Rewards
                  </span>
                </div>
                <span
                  className="font-terminal"
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#059669',
                    backgroundColor: '#FFFFFF',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '16px',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                  }}
                >
                  {unclaimedCount} Preserved
                </span>
              </div>
            )}

            {/* Settled to Remove */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                backgroundColor: '#F9FAFB',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                borderRadius: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <Trash2 size={16} style={{ color: '#9CA3AF' }} />
                <span className="font-bobz" style={{ fontSize: '0.82rem', color: '#4B5563' }}>
                  Settled Records to Clear
                </span>
              </div>
              <span
                className="font-terminal"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#EF4444',
                  backgroundColor: '#FFFFFF',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '16px',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                {settledCount} Removed
              </span>
            </div>
          </div>

          {/* Reassurance Callout */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.55rem',
              padding: '0.65rem 0.85rem',
              backgroundColor: '#F3F4F6',
              borderRadius: '10px',
              fontSize: '0.72rem',
              color: '#4B5563',
              lineHeight: 1.4,
            }}
          >
            <ShieldCheck size={15} style={{ color: '#10B981', flexShrink: 0, marginTop: '1px' }} />
            <span>
              Your connected wallet balance, lifetime win/loss statistics, and on-chain Somnia receipts remain 100% intact.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#F9FAFB',
            borderTop: '1px solid rgba(0, 0, 0, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '0.65rem 1.15rem',
              borderRadius: '10px',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-bobz)',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-bobz)',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#DC2626')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#EF4444')}
          >
            <Trash2 size={14} />
            <span>Clear {settledCount} Resolved</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
